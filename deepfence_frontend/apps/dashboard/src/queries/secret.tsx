import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getSearchApiClient } from '@/api/api';
import { ModelScanInfo, SearchSearchScanReq } from '@/api/generated';
import { apiWrapper } from '@/utils/api';

export const secretQueries = createQueryKeys('secret', {
  scanList: (filters: {
    page?: number;
    nodeTypes?: string[];
    order?: {
      sortBy: string;
      descending: boolean;
    };
    status?: string[];
    hosts?: string[];
    containers?: string[];
    images?: string[];
    clusters?: string[];
    pageSize: number;
  }) => {
    const {
      page = 1,
      nodeTypes = [],
      status,
      hosts,
      containers,
      images,
      clusters,
      pageSize,
      order,
    } = filters;
    return {
      queryKey: [{ filters }],
      queryFn: async () => {
        type ScanResult = ModelScanInfo & {
          total: number;
          critical: number;
          high: number;
          medium: number;
          low: number;
          unknown: number;
        };
        const results: {
          scans: ScanResult[];
          currentPage: number;
          totalRows: number;
          message?: string;
        } = {
          scans: [],
          currentPage: 1,
          totalRows: 0,
        };

        const scanFilters = {} as {
          status?: string[];
        };

        if (status && status.length > 0) {
          scanFilters.status = status;
        }

        const nodeFilters = {
          node_type: nodeTypes,
        } as {
          status?: string[];
          node_type?: string[];
          host_name?: string[];
          node_id?: string[];
          docker_image_id?: string[];
          kubernetes_cluster_id?: string[];
        };
        if (hosts && hosts?.length > 0) {
          nodeFilters.host_name = nodeFilters.host_name
            ? nodeFilters.host_name.concat(hosts)
            : hosts;
        }
        if (containers && containers?.length > 0) {
          nodeFilters.node_id = nodeFilters.node_id
            ? nodeFilters.node_id.concat(containers)
            : containers;
        }
        if (images && images?.length > 0) {
          nodeFilters.docker_image_id = nodeFilters.docker_image_id
            ? nodeFilters.docker_image_id.concat(images)
            : images;
        }

        if (clusters && clusters?.length > 0) {
          nodeFilters.kubernetes_cluster_id = clusters;
        }

        const scanRequestParams: SearchSearchScanReq = {
          node_filters: {
            filters: {
              match_filter: { filter_in: {} },
              order_filter: { order_fields: [] },
              contains_filter: { filter_in: { ...nodeFilters } },
              compare_filter: null,
            },
            in_field_filter: null,
            window: {
              offset: 0,
              size: 0,
            },
          },
          scan_filters: {
            filters: {
              match_filter: { filter_in: {} },
              order_filter: { order_fields: [] },
              contains_filter: { filter_in: { ...scanFilters } },
              compare_filter: null,
            },
            in_field_filter: null,
            window: {
              offset: 0,
              size: 1,
            },
          },
          window: { offset: page * pageSize, size: pageSize },
        };
        if (order) {
          scanRequestParams.scan_filters.filters.order_filter.order_fields = [
            {
              field_name: order.sortBy,
              descending: order.descending,
            },
          ];
        } else {
          scanRequestParams.scan_filters.filters.order_filter.order_fields = [
            {
              field_name: 'updated_at',
              descending: true,
            },
          ];
        }
        const searchSecretsScanApi = apiWrapper({
          fn: getSearchApiClient().searchSecretsScan,
        });
        const result = await searchSecretsScanApi({
          searchSearchScanReq: scanRequestParams,
        });
        if (!result.ok) {
          throw result.error;
        }

        const countsResultApi = apiWrapper({
          fn: getSearchApiClient().searchSecretScanCount,
        });
        const countsResult = await countsResultApi({
          searchSearchScanReq: {
            ...scanRequestParams,
            window: {
              ...scanRequestParams.window,
              size: 10 * scanRequestParams.window.size,
            },
          },
        });
        if (!countsResult.ok) {
          throw countsResult.error;
        }

        if (result.value === null) {
          return results;
        }

        results.scans = result.value.map((scan) => {
          const severities = scan.severity_counts as {
            critical: number;
            high: number;
            medium: number;
            low: number;
            unknown: number;
          };
          severities.critical = severities.critical ?? 0;
          severities.high = severities.high ?? 0;
          severities.medium = severities.medium ?? 0;
          severities.low = severities.low ?? 0;
          severities.unknown = severities.unknown ?? 0;

          return {
            ...scan,
            total:
              severities.critical + severities.high + severities.medium + severities.low,
            critical: severities.critical,
            high: severities.high,
            medium: severities.medium,
            low: severities.low,
            unknown: severities.unknown,
          };
        });

        results.currentPage = page;
        results.totalRows = page * pageSize + countsResult.value.count;

        return results;
      },
    };
  },
  secret: (filters: { id: string }) => {
    const { id } = filters;
    return {
      queryKey: [filters],
      queryFn: async () => {
        const searchSecretsApi = apiWrapper({
          fn: getSearchApiClient().searchSecrets,
        });
        const searchSecretsResponse = await searchSecretsApi({
          searchSearchNodeReq: {
            node_filter: {
              filters: {
                contains_filter: {
                  filter_in: {
                    node_id: [id],
                  },
                },
                order_filter: {
                  order_fields: [],
                },
                match_filter: {
                  filter_in: {},
                },
                compare_filter: null,
              },
              in_field_filter: null,
              window: {
                offset: 0,
                size: 0,
              },
            },
            window: {
              offset: 0,
              size: 1,
            },
          },
        });
        if (!searchSecretsResponse.ok) {
          console.error(searchSecretsResponse.error);
          return {
            data: undefined,
            message: 'Error getting the Secret details',
          };
        }

        if (
          searchSecretsResponse.value === null ||
          searchSecretsResponse.value.length === 0
        ) {
          return {
            data: undefined,
            message: 'Error finding the Secret details',
          };
        }
        return {
          data: searchSecretsResponse.value[0],
        };
      },
    };
  },
});
