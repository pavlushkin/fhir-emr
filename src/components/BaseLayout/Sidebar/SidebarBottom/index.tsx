import { GlobalOutlined, LogoutOutlined } from '@ant-design/icons';
import { t } from '@lingui/macro';
import { Button, Menu } from 'antd';
import { ItemType } from 'antd/lib/menu/hooks/useItems';
import classNames from 'classnames';
import { useCallback } from 'react';

import { resetInstanceToken as resetAidboxInstanceToken } from 'aidbox-react/lib/services/instance';

import { resetInstanceToken as resetFHIRInstanceToken } from 'fhir-react/lib/services/instance';

import { dynamicActivate, setCurrentLocale, getCurrentLocale, locales } from 'shared/src/services/i18n';
import { renderHumanName } from 'shared/src/utils/fhir';

import { MenuIcon } from 'src/icons/general/Menu';
import { AvatarImage } from 'src/images/AvatarImage';
import { getToken, logout } from 'src/services/auth';
import { sharedAuthorizedOrganization, sharedAuthorizedPatient, sharedAuthorizedPractitioner } from 'src/sharedState';
import { Role, matchCurrentUserRole } from 'src/utils/role';

import s from './SidebarBottom.module.scss';
import { S } from './SidebarBottom.styles';

interface MenuItem {
    key: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    children?: ItemType[];
}

interface Props extends React.HTMLAttributes<HTMLDivElement> {
    collapsed: boolean;
    toggleCollapsed?: () => void;
    onItemClick?: () => void;
}

export function SidebarBottom(props: Props) {
    const { collapsed, toggleCollapsed, onItemClick, ...other } = props;
    const appToken = getToken();
    const isAnonymousUser = !appToken;

    return (
        <S.Container
            className={classNames(s.container, {
                _collapsed: collapsed,
            })}
            {...other}
        >
            <S.Divider $hidden={collapsed} />
            <LocaleSwitcher onItemClick={onItemClick} />
            {!isAnonymousUser ? (
                <>
                    <S.Divider $hidden={collapsed} />
                    <UserMenu onItemClick={onItemClick} />
                </>
            ) : null}
            {toggleCollapsed && (
                <>
                    <S.Divider $hidden={collapsed} />
                    <Button icon={<MenuIcon />} className={s.collapseButton} type="default" onClick={toggleCollapsed} />
                </>
            )}
        </S.Container>
    );
}

export function renderMenu(items: MenuItem[]): ItemType[] {
    return items.map((item) => ({
        key: item.key,
        icon: <S.Icon>{item.icon}</S.Icon>,
        label: <span className={s.menuItemLabel}>{item.label}</span>,
        children: item.children?.map((child) => ({
            ...child,
            className: s.submenuItem,
        })),
    }));
}

function UserMenu(props: { onItemClick?: () => void }) {
    const { onItemClick } = props;
    const doLogout = useCallback(async () => {
        await logout();
        resetAidboxInstanceToken();
        resetFHIRInstanceToken();
        localStorage.clear();
        window.location.href = '/';
    }, []);

    const userMenu = [
        {
            label: t`Log out`,
            key: 'logout',
            onClick: () => {
                doLogout();
                onItemClick?.();
            },
            icon: <LogoutOutlined />,
        },
    ];

    return (
        <Menu
            mode="inline"
            theme="light"
            className={s.menu}
            items={renderMenu([
                {
                    key: 'user',
                    icon: <AvatarImage className={s.avatar} />,
                    label: (
                        <>
                            {matchCurrentUserRole({
                                [Role.Admin]: () => <OrganizationName />,
                                [Role.Patient]: () => <PatientName />,
                                [Role.Practitioner]: () => <PractitionerName />,
                                [Role.Receptionist]: () => <PractitionerName />,
                            })}
                        </>
                    ),
                    children: userMenu,
                },
            ])}
        />
    );
}

function PatientName() {
    const [patient] = sharedAuthorizedPatient.useSharedState();

    return <span>{renderHumanName(patient?.name?.[0])}</span>;
}

function PractitionerName() {
    const [practitioner] = sharedAuthorizedPractitioner.useSharedState();

    return <span>{renderHumanName(practitioner?.name?.[0])}</span>;
}

function OrganizationName() {
    const [organization] = sharedAuthorizedOrganization.useSharedState();

    return <span>{organization?.name}</span>;
}

function LocaleSwitcher(props: { onItemClick?: () => void }) {
    const { onItemClick } = props;
    const currentLocale = getCurrentLocale();
    const localesList = Object.entries(locales);
    const items = localesList.map(([value, label]) => ({
        label: <div>{label}</div>,
        key: value,
        onClick: () => {
            onChangeLocale(value);
            onItemClick?.();
        },
    }));

    const onChangeLocale = (key: string) => {
        setCurrentLocale(key);
        dynamicActivate(key);
    };

    return (
        <Menu
            mode="inline"
            theme="light"
            className={classNames(s.menu, s.localeMenu)}
            items={renderMenu([
                {
                    key: 'locale',
                    icon: <GlobalOutlined />,
                    label: locales[currentLocale],
                    children: items,
                },
            ])}
        />
    );
}
