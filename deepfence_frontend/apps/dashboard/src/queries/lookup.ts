import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getLookupApiClient } from '@/api/api';
import { apiWrapper } from '@/utils/api';

export const lookupQueries = createQueryKeys('lookup', {
  host: (params: { nodeId: string }) => {
    return {
      queryKey: [params],
      queryFn: async () => {
        const { nodeId } = params;
        const lookupHostApi = apiWrapper({
          fn: getLookupApiClient().lookupHost,
        });
        const lookupResult = await lookupHostApi({
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
          hostData: lookupResult.value[0],
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
});
