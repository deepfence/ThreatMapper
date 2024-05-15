import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getRegistriesApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelRegistryImagesReq,
  ModelRegistryImageStubsReq,
  ModelSummary,
} from '@/api/generated';
import { apiWrapper } from '@/utils/api';
import {
  MALWARE_SCAN_STATUS_GROUPS,
  MalwareScanGroupedStatus,
  SECRET_SCAN_STATUS_GROUPS,
  SecretScanGroupedStatus,
  VULNERABILITY_SCAN_STATUS_GROUPS,
  VulnerabilityScanGroupedStatus,
} from '@/utils/scan';

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
            repositories: value.repositories,
            images: value.images,
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
    const { page = 1, pageSize, registryId, order } = filters;
    return {
      queryKey: [{ filters }],
      queryFn: async () => {
        const imageRequest: ModelRegistryImageStubsReq = {
          image_filter: {
            contains_filter: {
              filter_in: null,
            },
            compare_filter: [],
            match_filter: {
              filter_in: {},
            },
            order_filter: {
              order_fields: [],
            },
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

        const resultPromise = listImageStubs({
          modelRegistryImageStubsReq: imageRequest,
        });

        const countImageStubs = apiWrapper({
          fn: getRegistriesApiClient().countImageStubs,
        });

        const resultCountsPromise = countImageStubs({
          modelRegistryImageStubsReq: {
            ...imageRequest,
            window: {
              ...imageRequest.window,
              size: 10 * imageRequest.window.size,
            },
          },
        });

        const [result, resultCounts] = await Promise.all([
          resultPromise,
          resultCountsPromise,
        ]);

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
  registryScanResults: (filters: {
    registryId: string;
    imageId: string;
    vulnerabilityScanStatus?: VulnerabilityScanGroupedStatus;
    secretScanStatus?: SecretScanGroupedStatus;
    malwareScanStatus?: MalwareScanGroupedStatus;
    page?: number;
    pageSize: number;
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    const {
      imageId,
      registryId,
      page = 1,
      pageSize,
      vulnerabilityScanStatus,
      secretScanStatus,
      malwareScanStatus,
      order,
    } = filters;
    return {
      queryKey: [filters],
      queryFn: async () => {
        const imageTagsRequest: ModelRegistryImagesReq = {
          image_filter: {
            compare_filter: [],
            match_filter: {
              filter_in: {},
            },
            order_filter: {
              order_fields: [],
            },
            contains_filter: {
              filter_in: {},
            },
            not_contains_filter: {
              filter_in: {},
            },
          },
          image_stub_filter: {
            compare_filter: [],
            match_filter: {
              filter_in: {},
            },
            order_filter: {
              order_fields: [],
            },
            contains_filter: {
              filter_in: {
                docker_image_name: [imageId],
              },
            },
            not_contains_filter: {
              filter_in: {},
            },
          },
          registry_id: registryId,
          window: {
            offset: page * pageSize,
            size: pageSize,
          },
        };

        if (vulnerabilityScanStatus) {
          if (vulnerabilityScanStatus === VulnerabilityScanGroupedStatus.neverScanned) {
            imageTagsRequest.image_filter.not_contains_filter!.filter_in = {
              ...imageTagsRequest.image_filter.not_contains_filter!.filter_in,
              vulnerability_scan_status: [
                ...VULNERABILITY_SCAN_STATUS_GROUPS.complete,
                ...VULNERABILITY_SCAN_STATUS_GROUPS.error,
                ...VULNERABILITY_SCAN_STATUS_GROUPS.inProgress,
                ...VULNERABILITY_SCAN_STATUS_GROUPS.starting,
              ],
            };
          } else {
            imageTagsRequest.image_filter.contains_filter.filter_in = {
              ...imageTagsRequest.image_filter.contains_filter.filter_in,
              vulnerability_scan_status:
                VULNERABILITY_SCAN_STATUS_GROUPS[vulnerabilityScanStatus],
            };
          }
        }
        if (secretScanStatus) {
          if (secretScanStatus === SecretScanGroupedStatus.neverScanned) {
            imageTagsRequest.image_filter.not_contains_filter!.filter_in = {
              ...imageTagsRequest.image_filter.not_contains_filter!.filter_in,
              secret_scan_status: [
                ...SECRET_SCAN_STATUS_GROUPS.complete,
                ...SECRET_SCAN_STATUS_GROUPS.error,
                ...SECRET_SCAN_STATUS_GROUPS.inProgress,
                ...SECRET_SCAN_STATUS_GROUPS.starting,
              ],
            };
          } else {
            imageTagsRequest.image_filter.contains_filter.filter_in = {
              ...imageTagsRequest.image_filter.contains_filter.filter_in,
              secret_scan_status: SECRET_SCAN_STATUS_GROUPS[secretScanStatus],
            };
          }
        }
        if (malwareScanStatus) {
          if (malwareScanStatus === MalwareScanGroupedStatus.neverScanned) {
            imageTagsRequest.image_filter.not_contains_filter!.filter_in = {
              ...imageTagsRequest.image_filter.not_contains_filter!.filter_in,
              malware_scan_status: [
                ...MALWARE_SCAN_STATUS_GROUPS.complete,
                ...MALWARE_SCAN_STATUS_GROUPS.error,
                ...MALWARE_SCAN_STATUS_GROUPS.inProgress,
                ...MALWARE_SCAN_STATUS_GROUPS.starting,
              ],
            };
          } else {
            imageTagsRequest.image_filter.contains_filter.filter_in = {
              ...imageTagsRequest.image_filter.contains_filter.filter_in,
              malware_scan_status: MALWARE_SCAN_STATUS_GROUPS[malwareScanStatus],
            };
          }
        }
        const listImages = apiWrapper({ fn: getRegistriesApiClient().listImages });

        const resultPromise = listImages({
          modelRegistryImagesReq: imageTagsRequest,
        });

        const countImages = apiWrapper({ fn: getRegistriesApiClient().countImages });
        const resultCountsPromise = countImages({
          modelRegistryImagesReq: {
            ...imageTagsRequest,
            window: {
              ...imageTagsRequest.window,
              size: 10 * imageTagsRequest.window.size,
            },
          },
        });

        const [result, resultCounts] = await Promise.all([
          resultPromise,
          resultCountsPromise,
        ]);

        if (!result.ok) {
          throw result.error;
        }

        if (!result.value) {
          return {
            tags: [],
            currentPage: 0,
            totalRows: 0,
          };
        }

        if (!resultCounts.ok) {
          throw resultCounts.error;
        }
        return {
          tags: result.value,
          currentPage: page,
          totalRows: page * pageSize + (resultCounts.value.count || 0),
        };
      },
    };
  },
});
