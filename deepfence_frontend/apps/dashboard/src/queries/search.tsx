import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getSearchApiClient } from '@/api/api';
import { ScanTypeEnum } from '@/types/common';
import { apiWrapper } from '@/utils/api';

export const searchQueries = createQueryKeys('search', {
  hosts: (filters: { scanType: string; searchText?: string; size: number }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async ({
        pageParam = 0,
      }): Promise<{
        hosts: {
          nodeId: string;
          hostName: string;
          nodeName: string;
        }[];
      }> => {
        const { scanType, searchText, size } = filters;
        const matchFilter = { filter_in: {} };
        if (searchText?.length) {
          matchFilter.filter_in = {
            node_name: [searchText],
          };
        }
        let filterValue = '';
        if (scanType === ScanTypeEnum.SecretScan) {
          filterValue = 'secrets_count';
        } else if (scanType === ScanTypeEnum.VulnerabilityScan) {
          filterValue = 'vulnerabilities_count';
        } else if (scanType === ScanTypeEnum.MalwareScan) {
          filterValue = 'malwares_count';
        } else if (
          scanType === ScanTypeEnum.ComplianceScan ||
          scanType === ScanTypeEnum.CloudComplianceScan
        ) {
          filterValue = 'compliances_count';
        }
        const searchHostsApi = apiWrapper({
          fn: getSearchApiClient().searchHosts,
        });
        const searchHostsResponse = await searchHostsApi({
          searchSearchNodeReq: {
            node_filter: {
              filters: {
                contains_filter: {
                  filter_in: {
                    pseudo: [false],
                  },
                },
                order_filter: {
                  order_fields: [
                    {
                      field_name: filterValue,
                      descending: true,
                    },
                  ],
                },
                match_filter: matchFilter,
                compare_filter: null,
              },
              in_field_filter: null,
              window: {
                offset: 0,
                size: 0,
              },
            },
            window: {
              offset: pageParam,
              size,
            },
          },
        });
        if (!searchHostsResponse.ok) {
          throw searchHostsResponse.error;
        }
        if (searchHostsResponse.value === null) {
          return {
            hosts: [],
          };
        }
        return {
          hosts: searchHostsResponse.value.map((res) => {
            return {
              nodeId: res.node_id,
              hostName: res.host_name,
              nodeName: res.node_name,
            };
          }),
        };
      },
    };
  },
});
