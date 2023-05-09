import { getRegistriesApiClient } from '@/api/api';
import { ModelSummary } from '@/api/generated';
import { useAuthedQuery } from '@/queries/client';

interface RegistryResponseType extends ModelSummary {
  type: string;
}

export function useRegistrySummary() {
  return useAuthedQuery('registrySummary', async () => {
    const response: RegistryResponseType[] = [];
    const result = await getRegistriesApiClient().getRegistriesSummary();
    for (const [key, value] of Object.entries(result)) {
      response.push({
        registries: value.registries,
        images: value.images,
        tags: value.tags,
        type: key,
      });
    }
    return response;
  });
}
