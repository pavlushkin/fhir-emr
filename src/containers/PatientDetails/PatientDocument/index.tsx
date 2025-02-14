import { notification } from 'antd';
import { Organization, Patient, Practitioner, QuestionnaireResponse } from 'fhir/r4b';
import { useEffect, useState } from 'react';
import { AudioRecorder, useAudioRecorder } from 'react-audio-voice-recorder';
import { useNavigate, useParams } from 'react-router-dom';

import { RenderRemoteData } from 'fhir-react/lib/components/RenderRemoteData';
import { isSuccess, notAsked, RemoteData } from 'fhir-react/lib/libs/remoteData';
import { service } from 'fhir-react/lib/services/fetch';
import { WithId } from 'fhir-react/lib/services/fhir';

import config from 'shared/src/config';

import { BaseQuestionnaireResponseForm } from 'src/components/BaseQuestionnaireResponseForm';
import { AnxietyScore, DepressionScore } from 'src/components/BaseQuestionnaireResponseForm/readonly-widgets/score';
import { Spinner } from 'src/components/Spinner';
import { usePatientHeaderLocationTitle } from 'src/containers/PatientDetails/PatientHeader/hooks';
import { getToken } from 'src/services/auth';

import s from './PatientDocument.module.scss';
import { S } from './PatientDocument.styles';
import { PatientDocumentHeader } from './PatientDocumentHeader';
import { usePatientDocument } from './usePatientDocument';

interface Props {
    patient: Patient;
    author: WithId<Practitioner | Patient | Organization>;
    questionnaireResponse?: WithId<QuestionnaireResponse>;
    questionnaireId?: string;
    encounterId?: string;
    onSuccess?: () => void;
}

interface FillWithAudioProps {
    questionnaireId: string;
    patientId: string;
    encounterId: string;
}
function FillWithAudio(props: FillWithAudioProps) {
    const recorderControls = useAudioRecorder();
    const navigate = useNavigate();

    const onRecordStop = async (blob: Blob) => {
        const audioFile = new File([blob], 'voice.webm', { type: blob.type });
        const formData = new FormData();
        formData.append('file', audioFile);
        const response = await service<{ questionnaireResponseId: string }>(
            `${config.aiAssistantServiceUrl}/convert?questionnaire=${props.questionnaireId}&patient=${props.patientId}&encounter=${props.encounterId}`,
            {
                method: 'POST',
                body: formData,
                headers: { Authorization: `Bearer ${getToken()}` },
            },
        );

        if (isSuccess(response)) {
            console.log('questionnaireResponseId', response.data.questionnaireResponseId);
            navigate(`/questionnaire-response-waiting/${response.data.questionnaireResponseId}`, {
                state: { encounterId: props.encounterId, patientId: props.patientId },
            });
        } else {
            notification.error({ message: JSON.stringify(response.error) });
        }
    };

    return (
        <AudioRecorder
            onRecordingComplete={async (blob) => {
                await onRecordStop(blob);
            }}
            audioTrackConstraints={{
                noiseSuppression: true,
                echoCancellation: true,
            }}
            recorderControls={recorderControls}
        />
    );
}

export function PatientDocument(props: Props) {
    const params = useParams<{ questionnaireId: string; encounterId?: string }>();
    const encounterId = props.encounterId || params.encounterId;
    const questionnaireId = props.questionnaireId || params.questionnaireId!;
    const { response } = usePatientDocument({
        ...props,
        questionnaireId,
        encounterId,
    });
    const navigate = useNavigate();

    const [draftSaveResponse, setDraftSaveResponse] = useState<RemoteData<QuestionnaireResponse>>(notAsked);

    const { savedMessage } = useSavedMessage(draftSaveResponse);

    usePatientHeaderLocationTitle({
        title: isSuccess(response) ? response.data.formData.context.questionnaire?.name ?? '' : '',
    });

    return (
        <div className={s.container}>
            <S.Content>
                <RenderRemoteData remoteData={response} renderLoading={Spinner}>
                    {({ formData, onSubmit, provenance }) => (
                        <>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'baseline',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <PatientDocumentHeader
                                    formData={formData}
                                    questionnaireId={questionnaireId}
                                    draftSaveResponse={draftSaveResponse}
                                    savedMessage={savedMessage}
                                />
                                {questionnaireId === 'ultrasound-pregnancy-screening-second-trimester' &&
                                encounterId ? (
                                    <FillWithAudio
                                        questionnaireId={questionnaireId}
                                        encounterId={encounterId}
                                        patientId={props.patient.id!}
                                    />
                                ) : null}
                            </div>
                            <BaseQuestionnaireResponseForm
                                formData={formData}
                                onSubmit={onSubmit}
                                itemControlQuestionItemComponents={{
                                    'anxiety-score': AnxietyScore,
                                    'depression-score': DepressionScore,
                                }}
                                onCancel={() => navigate(-1)}
                                saveButtonTitle={'Complete'}
                                autoSave={!provenance}
                                draftSaveResponse={draftSaveResponse}
                                setDraftSaveResponse={setDraftSaveResponse}
                            />
                        </>
                    )}
                </RenderRemoteData>
            </S.Content>
        </div>
    );
}

function useSavedMessage(draftSaveResponse: RemoteData) {
    const [savedMessage, setSavedMessage] = useState('');

    useEffect(() => {
        if (isSuccess(draftSaveResponse)) {
            setSavedMessage('Saved');

            const timeoutId = setTimeout(() => {
                setSavedMessage('');
            }, 2500);
            return () => clearTimeout(timeoutId);
        }
    }, [draftSaveResponse]);
    return { savedMessage };
}
