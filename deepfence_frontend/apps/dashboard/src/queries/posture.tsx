import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getCloudNodesApiClient } from '@/api/api';
import { apiWrapper } from '@/utils/api';

export const postureQueries = createQueryKeys('posture', {
  postureSummary: () => {
    return {
      queryKey: ['postureSummary'],
      queryFn: async () => {
        const getPostureSummary = apiWrapper({
          fn: getCloudNodesApiClient().listCloudProviders,
        });
        const result = await getPostureSummary();
        if (!result.ok) {
          throw result.error;
        }
        if (!result.value.providers) {
          result.value.providers = [];
        }
        return result.value;
      },
    };
  },
});
