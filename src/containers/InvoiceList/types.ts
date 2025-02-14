import { Invoice } from 'fhir/r4b';

import { PagerManager } from 'fhir-react/lib/hooks/pager';

import { SelectOption } from '../OrganizationScheduling/HealthcareServicePractitionerSelect/types';

export interface ModalCancelInvoiceProps {
    onSuccess: () => void;
    invoice: Invoice;
}
export interface InvoiceListSearchBarSelectProps {
    selectedPatient: SelectOption;
    selectedPractitionerRole: SelectOption;
    selectedStatus: SelectOption;
    loadPatientOptions: (search: string) => void;
    loadPractitionerRoleOptions: (search: string) => void;
    loadStatusOptions: (search: string) => void;
    onChangePatient: (option: SelectOption) => void;
    onChangePractitionerRole: (option: SelectOption) => void;
    onChangeStatus: (option: SelectOption) => void;
    reset: () => void;
}

export interface InvoiceActionsProps {
    manager: PagerManager;
    invoice: Invoice;
    simplified?: boolean;
}
