import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelSummary } from '@/api/generated';
import { apiWrapper } from '@/utils/api';

export const registryQueries = createQueryKeys('registry', {
  registrySummary: () => {
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
    };
  },
  registrySummaryByType: (filters: { registryType: string }) => {
    const { registryType } = filters;
    return {
      queryKey: [{ filters }],
      queryFn: async () => {
        if (!registryType) {
          throw new Error('Registry Type is required');
        }
        const getRegistrySummaryByType = apiWrapper({
          fn: getRegistriesApiClient().getRegistrySummaryByType,
        });
        const registrySummary = await getRegistrySummaryByType({
          registryType,
        });
        if (!registrySummary.ok) {
          if (registrySummary.error.response.status === 400) {
            const modelResponse: ApiDocsBadRequestResponse =
              await registrySummary.error.response.json();
            return {
              message: modelResponse.message,
              summary: {},
            };
          }
          throw registrySummary.error;
        }
        return {
          summary: registrySummary.value,
        };
      },
    };
  },
  listRegistryAccounts: () => {
    return {
      queryKey: ['listRegistryAccounts'],
      queryFn: async () => {
        const listRegistries = apiWrapper({
          fn: getRegistriesApiClient().listRegistries,
        });

        const listAccounts = await listRegistries();

        if (!listAccounts.ok) {
          if (listAccounts.error.response.status === 400) {
            const modelResponse: ApiDocsBadRequestResponse =
              await listAccounts.error.response.json();
            return {
              message: modelResponse.message,
              accounts: [],
            };
          }
          throw listAccounts.error;
        }

        return {
          accounts: listAccounts.value,
        };
      },
    };
  },
  listImages: (filters: {
    registryId: string;
    page?: number;
    pageSize: number;
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    const { page = 1, pageSize, registryId } = filters;
    return {
      queryKey: [{ filters }],
      queryFn: async () => {
        const imageRequest = {
          image_filter: {
            filter_in: null,
          },
          registry_id: registryId,
          window: {
            offset: page * pageSize,
            size: pageSize,
          },
        };
        const listImageStubs = apiWrapper({
          fn: getRegistriesApiClient().listImageStubs,
        });

        const result = await listImageStubs({
          modelRegistryImageStubsReq: imageRequest,
        });

        if (!result.ok) {
          throw result.error;
        }
        if (!result.value) {
          return {
            images: [],
            currentPage: 0,
            totalRows: 0,
          };
        }
        const countImageStubs = apiWrapper({
          fn: getRegistriesApiClient().countImageStubs,
        });

        const resultCounts = await countImageStubs({
          modelRegistryImageStubsReq: {
            ...imageRequest,
            window: {
              ...imageRequest.window,
              size: 10 * imageRequest.window.size,
            },
          },
        });

        if (!resultCounts.ok) {
          throw resultCounts.error;
        }
        return {
          images: result.value,
          currentPage: page,
          totalRows: page * pageSize + (resultCounts.value.count || 0),
        };
      },
    };
  },
  getImageSummary: (filters: { registryId: string }) => {
    const { registryId } = filters;
    return {
      queryKey: ['getImageSummary'],
      queryFn: async () => {
        const getRegistrySummary = apiWrapper({
          fn: getRegistriesApiClient().getRegistrySummary,
        });
        const registrySummary = await getRegistrySummary({
          registryId,
        });

        if (!registrySummary.ok) {
          throw registrySummary.error;
        }

        return {
          summary: registrySummary.value,
        };
      },
    };
  },
});
