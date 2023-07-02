import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getSearchApiClient } from '@/api/api';
import { apiWrapper } from '@/utils/api';

export const topologyQueries = createQueryKeys('topology', {
  nodeCounts: () => {
    return {
      queryKey: ['nodeCounts'],
      queryFn: async () => {
        const getNodeCountsApi = apiWrapper({
          fn: getSearchApiClient().getNodeCounts,
        });
        const nodeCounts = await getNodeCountsApi();

        if (!nodeCounts.ok) {
          throw new Error('Node counts failed');
        }
        return nodeCounts.value;
      },
    };
  },
});
