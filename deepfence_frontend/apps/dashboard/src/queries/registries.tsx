import { UseQueryOptions } from '@tanstack/react-query';

import { getRegistriesApiClient } from '@/api/api';
import { ModelSummary } from '@/api/generated';
import { apiWrapper } from '@/utils/api';

export function registrySummaryQuery() {
  return {
    queryKey: ['registrySummary'],
    queryFn: async () => {
      interface RegistryResponseType extends ModelSummary {
        type: string;
      }
      const response: RegistryResponseType[] = [];
      const getRegistriesSummary = apiWrapper({
        fn: getRegistriesApiClient().getRegistriesSummary,
      });
      const result = await getRegistriesSummary();
      if (!result.ok) {
        throw result.error;
      }
      for (const [key, value] of Object.entries(result.value)) {
        response.push({
          registries: value.registries,
          images: value.images,
          tags: value.tags,
          type: key,
        });
      }
      return response;
    },
  } satisfies UseQueryOptions;
}
