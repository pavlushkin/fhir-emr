import { extractBundleResources } from 'fhir-react/lib/services/fhir';
import { mapSuccess } from 'fhir-react/lib/services/service';

import { HealthcareService } from 'shared/src/contrib/aidbox';

import { StringTypeColumnFilterValue } from 'src/components/SearchBar/types';
import { usePagerExtended } from 'src/hooks/pager';
import { useDebounce } from 'src/utils/debounce';

export function useHealthcareServiceList(filterValues: StringTypeColumnFilterValue[]) {
    const debouncedFilterValues = useDebounce(filterValues, 300);

    const healthcareServiceFilterValue = debouncedFilterValues[0];

    const queryParameters = {
        _sort: '-_lastUpdated',
        ...(healthcareServiceFilterValue ? { ilike: healthcareServiceFilterValue.value } : {}),
    };

    const { resourceResponse, pagerManager, handleTableChange, pagination } = usePagerExtended<
        HealthcareService,
        StringTypeColumnFilterValue[]
    >('HealthcareService', queryParameters, debouncedFilterValues);

    const healthcareServiceResponse = mapSuccess(
        resourceResponse,
        (bundle) => extractBundleResources(bundle).HealthcareService,
    );

    return {
        pagination,
        healthcareServiceResponse,
        pagerManager,
        handleTableChange,
    };
}
