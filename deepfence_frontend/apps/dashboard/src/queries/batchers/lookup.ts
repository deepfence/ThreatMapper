import { create, windowScheduler } from '@yornaath/batshit';

import { getLookupApiClient } from '@/api/api';
import { apiWrapper } from '@/utils/api';

export const lookupHostsBatcher = create({
  fetcher: async (ids: string[]) => {
    const lookupHostApi = apiWrapper({
      fn: getLookupApiClient().lookupHost,
    });
    const lookupResult = await lookupHostApi({
      lookupLookupFilter: {
        node_ids: ids,
        in_field_filter: null,
        window: {
          offset: 0,
          size: ids.length,
        },
      },
    });

    if (!lookupResult.ok) {
      throw new Error(`Failed to lookup hosts`);
    }

    return lookupResult.value;
  },
  resolver: (items, id) => items.find((item) => item.node_id === id) ?? null,
  scheduler: windowScheduler(10),
});

export const lookupContainerImagesBatcher = create({
  fetcher: async (ids: string[]) => {
    const lookupImageApi = apiWrapper({
      fn: getLookupApiClient().lookupImage,
    });
    const lookupResult = await lookupImageApi({
      lookupLookupFilter: {
        node_ids: ids,
        in_field_filter: null,
        window: {
          offset: 0,
          size: ids.length,
        },
      },
    });

    if (!lookupResult.ok) {
      throw new Error(`Failed to lookup container image`);
    }

    return lookupResult.value;
  },
  resolver: (items, id) => items.find((item) => item.node_id === id) ?? null,
  scheduler: windowScheduler(10),
});

export const lookupClusterBatcher = create({
  fetcher: async (ids: string[]) => {
    const lookupKubernetesClusters = apiWrapper({
      fn: getLookupApiClient().lookupKubernetesClusters,
    });
    const lookupResult = await lookupKubernetesClusters({
      lookupLookupFilter: {
        node_ids: ids,
        in_field_filter: null,
        window: {
          offset: 0,
          size: ids.length,
        },
      },
    });

    if (!lookupResult.ok) {
      throw new Error(`Failed to lookup kubernetes clusters`);
    }

    return lookupResult.value;
  },
  resolver: (items, id) => items.find((item) => item.node_id === id) ?? null,
  scheduler: windowScheduler(10),
});

export const lookupContainerBatcher = create({
  fetcher: async (ids: string[]) => {
    const lookupContainer = apiWrapper({
      fn: getLookupApiClient().lookupContainer,
    });
    const lookupResult = await lookupContainer({
      lookupLookupFilter: {
        node_ids: ids,
        in_field_filter: null,
        window: {
          offset: 0,
          size: ids.length,
        },
      },
    });

    if (!lookupResult.ok) {
      throw new Error(`Failed to lookup containers`);
    }

    return lookupResult.value;
  },
  resolver: (items, id) => items.find((item) => item.node_id === id) ?? null,
  scheduler: windowScheduler(10),
});

export const lookupRegistryAccountBatcher = create({
  fetcher: async (ids: string[]) => {
    const lookupRegistryAccounts = apiWrapper({
      fn: getLookupApiClient().lookupRegistryAccounts,
    });
    const lookupResult = await lookupRegistryAccounts({
      lookupLookupFilter: {
        node_ids: ids,
        in_field_filter: null,
        window: {
          offset: 0,
          size: ids.length,
        },
      },
    });

    if (!lookupResult.ok) {
      throw new Error(`Failed to lookup registry accounts`);
    }

    return lookupResult.value;
  },
  resolver: (items, id) => items.find((item) => item.node_id === id) ?? null,
  scheduler: windowScheduler(10),
});

export const lookupPodBatcher = create({
  fetcher: async (ids: string[]) => {
    const lookupPod = apiWrapper({
      fn: getLookupApiClient().lookupPod,
    });
    const lookupResult = await lookupPod({
      lookupLookupFilter: {
        node_ids: ids,
        in_field_filter: null,
        window: {
          offset: 0,
          size: ids.length,
        },
      },
    });

    if (!lookupResult.ok) {
      throw new Error(`Failed to lookup pods`);
    }

    return lookupResult.value;
  },
  resolver: (items, id) => items.find((item) => item.node_id === id) ?? null,
  scheduler: windowScheduler(10),
});
