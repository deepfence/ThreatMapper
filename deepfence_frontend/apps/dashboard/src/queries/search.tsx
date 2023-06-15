import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getSearchApiClient } from '@/api/api';
import { ScanTypeEnum } from '@/types/common';
import { apiWrapper } from '@/utils/api';

export const searchQueries = createQueryKeys('search', {
  hosts: (filters: {
    scanType: string;
    searchText?: string;
    size: number;
    active?: boolean;
  }) => {
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
        const { scanType, searchText, size, active } = filters;
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
                    ...(active !== undefined && { active: [active === true] }),
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
  containers: (filters: {
    scanType: string;
    searchText?: string;
    size: number;
    active?: boolean;
  }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async ({
        pageParam = 0,
      }): Promise<{
        containers: {
          nodeId: string;
          hostName: string;
        }[];
      }> => {
        const { scanType, searchText, size, active } = filters;
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
        const searchContainersApi = apiWrapper({
          fn: getSearchApiClient().searchContainers,
        });
        const searchContainersResponse = await searchContainersApi({
          searchSearchNodeReq: {
            node_filter: {
              filters: {
                contains_filter: {
                  filter_in: {
                    pseudo: [false],
                    ...(active !== undefined && { active: [active === true] }),
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
        if (!searchContainersResponse.ok) {
          throw searchContainersResponse.error;
        }

        if (searchContainersResponse.value === null) {
          return {
            containers: [],
          };
        }
        return {
          containers: searchContainersResponse.value.slice(0, size).map((res) => {
            return {
              nodeId: res.node_id,
              hostName: res.docker_container_name,
            };
          }),
        };
      },
    };
  },
  containerImages: (filters: {
    scanType: string;
    searchText?: string;
    size: number;
    active?: boolean;
  }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async ({
        pageParam = 0,
      }): Promise<{
        containerImages: {
          nodeId: string;
          imageName: string;
        }[];
      }> => {
        const { scanType, searchText, size, active } = filters;
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
        const searchContainerImagesApi = apiWrapper({
          fn: getSearchApiClient().searchContainerImages,
        });
        const searchContainerImagesResponse = await searchContainerImagesApi({
          searchSearchNodeReq: {
            node_filter: {
              filters: {
                contains_filter: {
                  filter_in: {
                    pseudo: [false],
                    ...(active !== undefined && { active: [active === true] }),
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
              in_field_filter: ['node_id', 'docker_image_name', 'docker_image_tag'],
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

        if (!searchContainerImagesResponse.ok) {
          throw searchContainerImagesResponse.error;
        }

        if (searchContainerImagesResponse.value === null) {
          return {
            containerImages: [],
          };
        }
        return {
          containerImages: searchContainerImagesResponse.value
            .slice(0, size)
            .map((res) => {
              return {
                nodeId: res.node_id,
                imageName: `${res.docker_image_name}:${res.docker_image_tag}`,
              };
            }),
        };
      },
    };
  },
  clusters: (filters: { searchText?: string; size: number; active?: boolean }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async ({
        pageParam = 0,
      }): Promise<{
        clusters: {
          nodeId: string;
          nodeName: string;
        }[];
      }> => {
        const { searchText, size, active } = filters;

        const matchFilter = { filter_in: {} };
        if (searchText?.length) {
          matchFilter.filter_in = {
            node_name: [searchText],
          };
        }

        const searchKubernetesClustersApi = apiWrapper({
          fn: getSearchApiClient().searchKubernetesClusters,
        });
        const searchKubernetesClustersResponse = await searchKubernetesClustersApi({
          searchSearchNodeReq: {
            node_filter: {
              filters: {
                compare_filter: null,
                contains_filter: {
                  filter_in: {
                    pseudo: [false],
                    ...(active !== undefined && { active: [active === true] }),
                  },
                },
                match_filter: matchFilter,

                order_filter: {
                  order_fields: null,
                },
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
        if (!searchKubernetesClustersResponse.ok) {
          throw searchKubernetesClustersResponse.error;
        }

        if (searchKubernetesClustersResponse.value === null) {
          return {
            clusters: [],
          };
        }

        return {
          clusters: searchKubernetesClustersResponse.value.slice(0, size).map((res) => {
            return {
              nodeId: res.node_id,
              nodeName: res.node_name,
            };
          }),
        };
      },
    };
  },
});
