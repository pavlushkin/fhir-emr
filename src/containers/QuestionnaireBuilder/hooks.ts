import { notification } from 'antd';
import { Questionnaire as FHIRQuestionnaire, QuestionnaireItem as FHIRQuestionnaireItem } from 'fhir/r4b';
import { notAsked, RemoteData } from 'fhir-react';
import _ from 'lodash';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GroupItemProps, QuestionItemProps } from 'sdc-qrf';

import { isFailure, isSuccess, loading, success } from 'fhir-react/lib/libs/remoteData';
import { getFHIRResource, saveFHIRResource } from 'fhir-react/lib/services/fhir';
import { formatError } from 'fhir-react/lib/utils/error';

import { fromFirstClassExtension, toFirstClassExtension } from 'shared/src/utils/converter';

import { generateQuestionnaire } from 'src/services/questionnaire-builder';

import { deleteQuestionnaireItem, getQuestionPath, moveQuestionnaireItem } from './utils';

export interface OnItemDrag {
    dropTargetItem: QuestionItemProps | GroupItemProps;
    dropSourceItem: QuestionItemProps | GroupItemProps;
    place: 'before' | 'after';
}

function cleanUpQuestionnaire(questionnaire: FHIRQuestionnaire) {
    function cleanUpItems(item: FHIRQuestionnaire['item']): FHIRQuestionnaire['item'] {
        return item?.reduce((acc, qItem) => {
            if (!qItem.linkId) {
                return acc;
            }

            return [...acc, { ...qItem, item: cleanUpItems(qItem.item) }];
        }, [] as FHIRQuestionnaireItem[]);
    }

    return { ...questionnaire, item: cleanUpItems(questionnaire.item) };
}

export function useQuestionnaireBuilder() {
    const navigate = useNavigate();
    const params = useParams();
    const [response, setResponse] = useState<RemoteData<FHIRQuestionnaire>>(notAsked);
    const [updateResponse, setUpdateResponse] = useState<RemoteData<FHIRQuestionnaire>>(notAsked);
    const [error, setError] = useState<string | undefined>();
    const [editHistory, setEditHistory] = useState({});
    const [selectedPrompt, setSelectedPrompt] = useState<string | undefined>(undefined);

    useEffect(() => {
        (async () => {
            setResponse(loading);
            if (params.id) {
                const r = await getFHIRResource<FHIRQuestionnaire>({
                    reference: `Questionnaire/${params.id}`,
                });
                setResponse(r);

                return;
            }

            const initialQuestionnaire: FHIRQuestionnaire = {
                resourceType: 'Questionnaire',
                status: 'draft',
                meta: {
                    profile: ['https://beda.software/beda-emr-questionnaire'],
                },
            };

            setResponse(success(initialQuestionnaire));
        })();
    }, [params.id]);

    const onSaveQuestionnaire = async (resource: FHIRQuestionnaire) => {
        const saveResponse = await saveFHIRResource(cleanUpQuestionnaire(resource));

        if (isSuccess(saveResponse)) {
            setResponse(saveResponse);
            navigate(`/questionnaires/${saveResponse.data.id}/edit`, { replace: true });
            notification.success({ message: 'The questionnaire is saved' });
        } else {
            notification.error({ message: formatError(saveResponse.error) });
            setError(formatError(saveResponse.error));
        }

        return saveResponse;
    };

    const onSubmitPrompt = useCallback(
        async (prompt: string) => {
            if (isSuccess(response)) {
                setUpdateResponse(loading);
                setError(undefined);
                const questionnaire = response.data;
                const saveResponse = await generateQuestionnaire(prompt, JSON.stringify(questionnaire));

                setUpdateResponse(saveResponse);
                if (isSuccess(saveResponse)) {
                    const newQuestionnaire = saveResponse.data;
                    setResponse(success(newQuestionnaire));
                    setEditHistory({ ...{ [prompt]: newQuestionnaire }, ...editHistory });
                    setSelectedPrompt(prompt);
                }

                if (isFailure(saveResponse)) {
                    setError(
                        saveResponse.error?.message || 'Something went wrong please try again or rewrite the message',
                    );
                    setResponse(success(response.data));
                }
            }
        },
        [editHistory, response],
    );

    const onItemChange = useCallback(
        (item: QuestionItemProps | GroupItemProps) => {
            if (isSuccess(response)) {
                const fceQuestionnaire = toFirstClassExtension(response.data);
                const path = getQuestionPath(fceQuestionnaire, item.questionItem, item.parentPath);
                const name = path.join('.');

                const fhirQuestionItem = fromFirstClassExtension({
                    resourceType: 'Questionnaire',
                    status: 'draft',
                    meta: {
                        profile: ['https://beda.software/beda-emr-questionnaire'],
                    },
                    item: [item.questionItem],
                }).item![0]!;

                const resultQuestionnaire = _.set({ ...response.data }, name, fhirQuestionItem);
                setResponse(success(resultQuestionnaire));
            }
        },
        [response],
    );

    const onItemDrag = useCallback(
        (props: OnItemDrag) => {
            const { dropTargetItem, dropSourceItem, place } = props;

            if (isSuccess(response)) {
                const questionnaire = response.data;
                const result = moveQuestionnaireItem(
                    toFirstClassExtension(questionnaire),
                    dropTargetItem,
                    dropSourceItem,
                    place,
                );
                setResponse(success(fromFirstClassExtension(result)));
            }
        },
        [response],
    );

    const onItemDelete = useCallback(
        (item: QuestionItemProps | GroupItemProps) => {
            if (isSuccess(response)) {
                const questionnaire = response.data;
                const result = deleteQuestionnaireItem(toFirstClassExtension(questionnaire), item);
                setResponse(success(fromFirstClassExtension(result)));
            }
        },
        [response],
    );

    const onPromptSelect = useCallback(
        (prompt: string) => {
            setResponse(success(editHistory[prompt]));
            setSelectedPrompt(prompt);
        },
        [editHistory],
    );

    const onPromptDelete = useCallback(
        (prompt: string) => {
            const currentPrompts = editHistory;
            delete currentPrompts[prompt];
            setEditHistory(currentPrompts);
            const activePrompt = Object.keys(currentPrompts)[0]!;
            onPromptSelect(activePrompt);
            setResponse(success(editHistory[activePrompt]));
        },
        [editHistory, onPromptSelect],
    );

    return {
        response,
        updateResponse,
        onSaveQuestionnaire,
        onSubmitPrompt,
        onItemChange,
        onItemDrag,
        onItemDelete,
        error,
        editHistory,
        setEditHistory,
        onPromptSelect,
        selectedPrompt,
        onPromptDelete,
    };
}
