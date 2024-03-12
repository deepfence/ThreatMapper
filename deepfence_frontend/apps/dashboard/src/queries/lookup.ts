import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getLookupApiClient } from '@/api/api';
import { apiWrapper } from '@/utils/api';

export const lookupQueries = createQueryKeys('lookup', {
  host: (params: { nodeIds: string[] }) => {
    return {
      queryKey: [params],
      queryFn: async () => {
        const { nodeIds: nodeIds } = params;
        const lookupHostApi = apiWrapper({
          fn: getLookupApiClient().lookupHost,
        });
        const lookupResult = await lookupHostApi({
          lookupLookupFilter: {
            node_ids: nodeIds,
            in_field_filter: null,
            window: {
              offset: 0,
              size: 1,
            },
          },
        });

        if (!lookupResult.ok || !lookupResult.value.length) {
          throw new Error(`Failed to load host: ${nodeIds}`);
        }

        return {
          hostData: lookupResult.value,
        };
      },
    };
  },
  container: (params: { nodeId: string }) => {
    return {
      queryKey: [params],
      queryFn: async () => {
        const { nodeId } = params;
        const lookupContainerApi = apiWrapper({
          fn: getLookupApiClient().lookupContainer,
        });
        const lookupResult = await lookupContainerApi({
          lookupLookupFilter: {
            node_ids: [nodeId],
            in_field_filter: null,
            window: {
              offset: 0,
              size: 1,
            },
          },
        });

        if (!lookupResult.ok || !lookupResult.value.length) {
          throw new Error(`Failed to load container: ${nodeId}`);
        }

        return {
          containerData: lookupResult.value[0],
        };
      },
    };
  },
  containerImage: (params: { nodeId: string }) => {
    return {
      queryKey: [params],
      queryFn: async () => {
        const { nodeId } = params;
        const lookupImageApi = apiWrapper({
          fn: getLookupApiClient().lookupImage,
        });
        const lookupResult = await lookupImageApi({
          lookupLookupFilter: {
            node_ids: [nodeId],
            in_field_filter: null,
            window: {
              offset: 0,
              size: 1,
            },
          },
        });
        if (!lookupResult.ok || !lookupResult.value.length) {
          throw new Error(`Failed to load container image: ${nodeId}`);
        }

        return {
          imageData: lookupResult.value[0],
        };
      },
    };
  },
  process: (params: { nodeId: string }) => {
    return {
      queryKey: [params],
      queryFn: async () => {
        const { nodeId } = params;
        const lookupProcessApi = apiWrapper({
          fn: getLookupApiClient().lookupProcess,
        });
        const lookupResult = await lookupProcessApi({
          lookupLookupFilter: {
            node_ids: [nodeId],
            in_field_filter: null,
            window: {
              offset: 0,
              size: 1,
            },
          },
        });

        if (!lookupResult.ok || !lookupResult.value.length) {
          throw new Error(`Failed to load host: ${nodeId}`);
        }

        return {
          processData: lookupResult.value[0],
        };
      },
    };
  },
  pod: (params: { nodeId: string }) => {
    return {
      queryKey: [params],
      queryFn: async () => {
        const { nodeId } = params;
        const lookupPodApi = apiWrapper({
          fn: getLookupApiClient().lookupPod,
        });
        const lookupResult = await lookupPodApi({
          lookupLookupFilter: {
            node_ids: [nodeId],
            in_field_filter: null,
            window: {
              offset: 0,
              size: 1,
            },
          },
        });

        if (!lookupResult.ok || !lookupResult.value.length) {
          throw new Error(`Failed to load pod: ${nodeId}`);
        }

        return {
          podData: lookupResult.value[0],
        };
      },
    };
  },
  cloudResources: (params: { nodeIds: string[] }) => {
    return {
      queryKey: [params],
      queryFn: async () => {
        const { nodeIds } = params;
        const lookupCloudResources = apiWrapper({
          fn: getLookupApiClient().lookupCloudResources,
        });
        const lookupResult = await lookupCloudResources({
          lookupLookupFilter: {
            node_ids: nodeIds,
            in_field_filter: null,
            window: {
              offset: 0,
              size: 1,
            },
          },
        });

        if (!lookupResult.ok || !lookupResult.value.length) {
          throw new Error(`Failed to load host: ${nodeIds}`);
        }

        return {
          cloudResourcesData: lookupResult.value,
        };
      },
    };
  },
  vulnerabilities: (filters: { cveIds: string[] }) => {
    const { cveIds } = filters;
    return {
      queryKey: [filters],
      queryFn: async () => {
        const lookupVulnerabilities = apiWrapper({
          fn: getLookupApiClient().lookupVulnerabilities,
        });
        const lookupVulnerabilitiesResponse = await lookupVulnerabilities({
          lookupLookupFilter: {
            node_ids: cveIds,
            in_field_filter: [],
            window: {
              offset: 0,
              size: cveIds.length,
            },
          },
        });
        if (!lookupVulnerabilitiesResponse.ok) {
          throw lookupVulnerabilitiesResponse.error;
        }

        return {
          data: lookupVulnerabilitiesResponse.value,
        };
      },
    };
  },
  secrets: (filters: { secretIds: string[] }) => {
    const { secretIds } = filters;
    return {
      queryKey: [filters],
      queryFn: async () => {
        const lookupSecrets = apiWrapper({
          fn: getLookupApiClient().lookupSecrets,
        });
        const lookupSecretsResponse = await lookupSecrets({
          lookupLookupFilter: {
            node_ids: secretIds,
            in_field_filter: [],
            window: {
              offset: 0,
              size: secretIds.length,
            },
          },
        });
        if (!lookupSecretsResponse.ok) {
          throw lookupSecretsResponse.error;
        }

        return {
          data: lookupSecretsResponse.value,
        };
      },
    };
  },
  malwares: (filters: { malwareIds: string[] }) => {
    const { malwareIds } = filters;
    return {
      queryKey: [filters],
      queryFn: async () => {
        const lookupMalwares = apiWrapper({
          fn: getLookupApiClient().lookupMalwares,
        });
        const lookupMalwaresResponse = await lookupMalwares({
          lookupLookupFilter: {
            node_ids: malwareIds,
            in_field_filter: [],
            window: {
              offset: 0,
              size: malwareIds.length,
            },
          },
        });
        if (!lookupMalwaresResponse.ok) {
          throw lookupMalwaresResponse.error;
        }

        return {
          data: lookupMalwaresResponse.value,
        };
      },
    };
  },
  compliances: (filters: { complianceIds: string[] }) => {
    const { complianceIds } = filters;
    return {
      queryKey: [filters],
      queryFn: async () => {
        const lookupCompliances = apiWrapper({
          fn: getLookupApiClient().lookupCompliances,
        });
        const lookupCompliancesResponse = await lookupCompliances({
          lookupLookupFilter: {
            node_ids: complianceIds,
            in_field_filter: [],
            window: {
              offset: 0,
              size: complianceIds.length,
            },
          },
        });
        if (!lookupCompliancesResponse.ok) {
          throw lookupCompliancesResponse.error;
        }

        return {
          data: lookupCompliancesResponse.value,
        };
      },
    };
  },
  cloudCompliances: (filters: { cloudComplianceIds: string[] }) => {
    const { cloudComplianceIds } = filters;
    return {
      queryKey: [filters],
      queryFn: async () => {
        const lookupCloudCompliances = apiWrapper({
          fn: getLookupApiClient().lookupCloudCompliances,
        });
        const lookupCloudCompliancesResponse = await lookupCloudCompliances({
          lookupLookupFilter: {
            node_ids: cloudComplianceIds,
            in_field_filter: [],
            window: {
              offset: 0,
              size: cloudComplianceIds.length,
            },
          },
        });
        if (!lookupCloudCompliancesResponse.ok) {
          throw lookupCloudCompliancesResponse.error;
        }

        return {
          data: lookupCloudCompliancesResponse.value,
        };
      },
    };
  },
  registryAccount: (filters: { nodeIds: string[] }) => {
    const { nodeIds } = filters;
    return {
      queryKey: [filters],
      queryFn: async () => {
        const lookupRegistryAccounts = apiWrapper({
          fn: getLookupApiClient().lookupRegistryAccounts,
        });
        const lookupRegistryAccountsResponse = await lookupRegistryAccounts({
          lookupLookupFilter: {
            node_ids: nodeIds,
            in_field_filter: [],
            window: {
              offset: 0,
              size: nodeIds.length,
            },
          },
        });
        if (!lookupRegistryAccountsResponse.ok) {
          throw lookupRegistryAccountsResponse.error;
        }

        return {
          data: lookupRegistryAccountsResponse.value,
        };
      },
    };
  },
});
