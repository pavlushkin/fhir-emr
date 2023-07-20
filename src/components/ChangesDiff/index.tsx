import { t } from '@lingui/macro';
import classNames from 'classnames';

import { formatHumanDateTime } from 'shared/src/utils/date';

import { Text } from 'src/components/Typography';

import { S } from './ChangesDiff.styles';

const codesMapping = {
    CREATE: t`Created`,
    UPDATE: t`Updated`,
};

interface Change {
    key: string;
    title: string;
    valueBefore: string | null;
    valueAfter: string | null;
}

export interface Props {
    id: string;
    changes: Change[];
    activityCode: string;
    recorded: string;
    author: string[];
}

export function ChangesDiff(props: Props) {
    console.log('props', props);
    const { changes, id, activityCode, recorded, author = [] } = props;
    const activity = codesMapping[activityCode];
    const date = formatHumanDateTime(recorded);
    const by = author.join(', ');

    return (
        <S.Container>
            <S.Header>
                <b>
                    {activity} {date} by {by}
                </b>
            </S.Header>
            {changes.map((item) => (
                <div key={`diff-${id}-${item.key}`}>
                    <Text>{item.title}</Text>
                    <S.DiffRow>
                        <S.DiffItem className={classNames(item.valueBefore ? '_deleted' : undefined)}>
                            {item.valueBefore}
                        </S.DiffItem>
                        <S.DiffItem className={classNames(item.valueAfter ? '_added' : undefined)}>
                            {item.valueAfter}
                        </S.DiffItem>
                    </S.DiffRow>
                </div>
            ))}
        </S.Container>
    );
}
