import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getCloudNodesApiClient, getSearchApiClient } from '@/api/api';
import { SearchSearchNodeReq } from '@/api/generated';
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
  postureAccounts: (filters: {
    page?: number;
    pageSize: number;
    status: string[];
    nodeType: string;
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    const { page = 1, pageSize, status, order, nodeType } = filters;
    return {
      queryKey: [{ filters }],
      queryFn: async () => {
        if (!nodeType) {
          throw new Error('Cloud Node Type is required');
        }
        const searchReq: SearchSearchNodeReq = {
          node_filter: {
            in_field_filter: [],
            filters: {
              compare_filter: [],
              contains_filter: { filter_in: { cloud_provider: [nodeType] } },
              match_filter: { filter_in: {} },
              order_filter: { order_fields: [] },
              not_contains_filter: { filter_in: {} },
            },
            window: {
              offset: 0,
              size: 0,
            },
          },
          window: { offset: page * pageSize, size: pageSize },
        };
        if (status && status.length) {
          if (status.length === 1) {
            if (status[0] === 'active') {
              searchReq.node_filter.filters.contains_filter.filter_in!['active'] = [true];
            } else {
              searchReq.node_filter.filters.contains_filter.filter_in!['active'] = [
                false,
              ];
            }
          }
        }

        if (order) {
          searchReq.node_filter.filters.order_filter.order_fields = [
            {
              field_name: order.sortBy,
              descending: order.descending,
            },
          ];
        }

        const searchCloudAccounts = apiWrapper({
          fn: getSearchApiClient().searchCloudAccounts,
        });
        const result = await searchCloudAccounts({
          searchSearchNodeReq: searchReq,
        });
        if (!result.ok) {
          throw result.error;
        }
        const countsResultApi = apiWrapper({
          fn: getSearchApiClient().searchCloudAccountsCount,
        });
        const countsResult = await countsResultApi({
          searchSearchNodeReq: {
            ...searchReq,
            window: {
              ...searchReq.window,
              size: 10 * searchReq.window.size,
            },
          },
        });
        if (!countsResult.ok) {
          throw countsResult.error;
        }

        return {
          accounts: result.value ?? [],
          currentPage: page,
          totalRows: page * pageSize + countsResult.value.count,
        };
      },
    };
  },
});
