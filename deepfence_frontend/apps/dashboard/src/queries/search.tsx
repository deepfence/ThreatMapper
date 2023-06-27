import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getSearchApiClient } from '@/api/api';
import { SearchSearchNodeReq } from '@/api/generated';
import { apiWrapper } from '@/utils/api';
import {
  COMPLIANCE_SCAN_STATUS_GROUPS,
  ComplianceScanGroupedStatus,
  MALWARE_SCAN_STATUS_GROUPS,
  MalwareScanGroupedStatus,
  SECRET_SCAN_STATUS_GROUPS,
  SecretScanGroupedStatus,
  VULNERABILITY_SCAN_STATUS_GROUPS,
  VulnerabilityScanGroupedStatus,
} from '@/utils/scan';

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
        const { searchText, size, active } = filters;
        const matchFilter = { filter_in: {} };
        if (searchText?.length) {
          matchFilter.filter_in = {
            node_name: [searchText],
          };
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
                      field_name: 'updated_at',
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
        const { searchText, size, active } = filters;
        const matchFilter = { filter_in: {} };
        if (searchText?.length) {
          matchFilter.filter_in = {
            node_name: [searchText],
          };
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
                      field_name: 'updated_at',
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
        const { searchText, size, active } = filters;
        const matchFilter = { filter_in: {} };
        if (searchText?.length) {
          matchFilter.filter_in = {
            node_name: [searchText],
          };
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
                      field_name: 'updated_at',
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
  hostsWithPagination: (filters: {
    page: number;
    pageSize: number;
    vulnerabilityScanStatus?: VulnerabilityScanGroupedStatus;
    secretScanStatus?: SecretScanGroupedStatus;
    malwareScanStatus?: MalwareScanGroupedStatus;
    complianceScanStatus?: ComplianceScanGroupedStatus;
    cloudProvider?: string[];
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    return {
      queryKey: [filters],
      queryFn: async () => {
        const {
          page,
          pageSize,
          vulnerabilityScanStatus,
          secretScanStatus,
          malwareScanStatus,
          complianceScanStatus,
          cloudProvider,
          order,
        } = filters;
        const searchSearchNodeReq: SearchSearchNodeReq = {
          node_filter: {
            in_field_filter: [],
            filters: {
              compare_filter: [],
              contains_filter: {
                filter_in: {
                  pseudo: [false],
                  active: [true],
                },
              },
              match_filter: {
                filter_in: {},
              },
              order_filter: {
                order_fields: [],
              },
              not_contains_filter: {
                filter_in: {},
              },
            },
            window: {
              offset: 0,
              size: 0,
            },
          },
          window: { offset: page * pageSize, size: pageSize },
        };
        if (vulnerabilityScanStatus) {
          if (vulnerabilityScanStatus === VulnerabilityScanGroupedStatus.neverScanned) {
            searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in,
              vulnerability_scan_status: [
                ...VULNERABILITY_SCAN_STATUS_GROUPS.complete,
                ...VULNERABILITY_SCAN_STATUS_GROUPS.error,
                ...VULNERABILITY_SCAN_STATUS_GROUPS.inProgress,
                ...VULNERABILITY_SCAN_STATUS_GROUPS.starting,
              ],
            };
          } else {
            searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
              vulnerability_scan_status:
                VULNERABILITY_SCAN_STATUS_GROUPS[vulnerabilityScanStatus],
            };
          }
        }
        if (secretScanStatus) {
          if (secretScanStatus === SecretScanGroupedStatus.neverScanned) {
            searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in,
              secret_scan_status: [
                ...SECRET_SCAN_STATUS_GROUPS.complete,
                ...SECRET_SCAN_STATUS_GROUPS.error,
                ...SECRET_SCAN_STATUS_GROUPS.inProgress,
                ...SECRET_SCAN_STATUS_GROUPS.starting,
              ],
            };
          } else {
            searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
              secret_scan_status: SECRET_SCAN_STATUS_GROUPS[secretScanStatus],
            };
          }
        }
        if (malwareScanStatus) {
          if (malwareScanStatus === MalwareScanGroupedStatus.neverScanned) {
            searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in,
              malware_scan_status: [
                ...MALWARE_SCAN_STATUS_GROUPS.complete,
                ...MALWARE_SCAN_STATUS_GROUPS.error,
                ...MALWARE_SCAN_STATUS_GROUPS.inProgress,
                ...MALWARE_SCAN_STATUS_GROUPS.starting,
              ],
            };
          } else {
            searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
              malware_scan_status: MALWARE_SCAN_STATUS_GROUPS[malwareScanStatus],
            };
          }
        }
        if (complianceScanStatus) {
          if (complianceScanStatus === ComplianceScanGroupedStatus.neverScanned) {
            searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in,
              compliance_scan_status: [
                ...COMPLIANCE_SCAN_STATUS_GROUPS.complete,
                ...COMPLIANCE_SCAN_STATUS_GROUPS.error,
                ...COMPLIANCE_SCAN_STATUS_GROUPS.inProgress,
                ...COMPLIANCE_SCAN_STATUS_GROUPS.starting,
              ],
            };
          } else {
            searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
              compliance_scan_status: COMPLIANCE_SCAN_STATUS_GROUPS[complianceScanStatus],
            };
          }
        }
        if (cloudProvider?.length) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
            ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
            cloud_provider: cloudProvider,
          };
        }
        if (order) {
          searchSearchNodeReq.node_filter.filters.order_filter.order_fields?.push({
            field_name: order.sortBy,
            descending: order.descending,
          });
        }

        const getThreatGraphApi = apiWrapper({
          fn: getSearchApiClient().searchHosts,
        });
        const hostsData = await getThreatGraphApi({
          searchSearchNodeReq,
        });

        if (!hostsData.ok) {
          throw hostsData;
        }

        const searchHostsCountApi = apiWrapper({
          fn: getSearchApiClient().searchHostsCount,
        });
        const hostsDataCount = await searchHostsCountApi({
          searchSearchNodeReq: {
            ...searchSearchNodeReq,
            window: {
              ...searchSearchNodeReq.window,
              size: 10 * searchSearchNodeReq.window.size,
            },
          },
        });

        if (!hostsDataCount.ok) {
          throw hostsDataCount;
        }

        return {
          hosts: hostsData.value,
          currentPage: page,
          totalRows: page * pageSize + hostsDataCount.value.count,
        };
      },
    };
  },
  clustersWithPagination: (filters: {
    page: number;
    pageSize: number;
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    return {
      queryKey: [filters],
      queryFn: async () => {
        const { page, pageSize, order } = filters;
        const searchSearchNodeReq: SearchSearchNodeReq = {
          node_filter: {
            filters: {
              compare_filter: null,
              contains_filter: {
                filter_in: {
                  active: [true],
                },
              },
              match_filter: {
                filter_in: null,
              },
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
          window: { offset: page * pageSize, size: pageSize },
        };
        if (order) {
          searchSearchNodeReq.node_filter.filters.order_filter.order_fields?.push({
            field_name: order.sortBy,
            descending: order.descending,
          });
        }
        const searchKubernetesClustersApi = apiWrapper({
          fn: getSearchApiClient().searchKubernetesClusters,
        });
        const clusterData = await searchKubernetesClustersApi({
          searchSearchNodeReq,
        });
        if (!clusterData.ok) {
          throw clusterData.error;
        }

        const countKubernetesClustersApi = apiWrapper({
          fn: getSearchApiClient().countKubernetesClusters,
        });
        const clustersDataCount = await countKubernetesClustersApi({
          searchSearchNodeReq: {
            ...searchSearchNodeReq,
            window: {
              ...searchSearchNodeReq.window,
              size: 10 * searchSearchNodeReq.window.size,
            },
          },
        });

        if (!clustersDataCount.ok) {
          throw clustersDataCount;
        }

        if (clusterData.value === null) {
          return {
            clusters: [],
            currentPage: 0,
            totalRows: 0,
          };
        }
        return {
          clusters: clusterData.value,
          currentPage: page,
          totalRows: page * pageSize + clustersDataCount.value.count,
        };
      },
    };
  },
  containersWithPagination: (filters: {
    page: number;
    pageSize: number;
    vulnerabilityScanStatus?: VulnerabilityScanGroupedStatus;
    secretScanStatus?: SecretScanGroupedStatus;
    malwareScanStatus?: MalwareScanGroupedStatus;
    hosts: string[];
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    return {
      queryKey: [filters],
      queryFn: async () => {
        const {
          page,
          pageSize,
          hosts,
          vulnerabilityScanStatus,
          secretScanStatus,
          malwareScanStatus,
          order,
        } = filters;
        const searchSearchNodeReq: SearchSearchNodeReq = {
          node_filter: {
            filters: {
              compare_filter: null,
              contains_filter: {
                filter_in: {
                  active: [true],
                  ...(hosts.length ? { host_name: hosts } : {}),
                },
              },
              match_filter: {
                filter_in: null,
              },
              order_filter: {
                order_fields: [],
              },
              not_contains_filter: {
                filter_in: {},
              },
            },
            in_field_filter: null,
            window: {
              offset: 0,
              size: 0,
            },
          },
          window: { offset: page * pageSize, size: pageSize },
        };
        if (vulnerabilityScanStatus) {
          if (vulnerabilityScanStatus === VulnerabilityScanGroupedStatus.neverScanned) {
            searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in,
              vulnerability_scan_status: [
                ...VULNERABILITY_SCAN_STATUS_GROUPS.complete,
                ...VULNERABILITY_SCAN_STATUS_GROUPS.error,
                ...VULNERABILITY_SCAN_STATUS_GROUPS.inProgress,
                ...VULNERABILITY_SCAN_STATUS_GROUPS.starting,
              ],
            };
          } else {
            searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
              vulnerability_scan_status:
                VULNERABILITY_SCAN_STATUS_GROUPS[vulnerabilityScanStatus],
            };
          }
        }
        if (secretScanStatus) {
          if (secretScanStatus === SecretScanGroupedStatus.neverScanned) {
            searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in,
              secret_scan_status: [
                ...SECRET_SCAN_STATUS_GROUPS.complete,
                ...SECRET_SCAN_STATUS_GROUPS.error,
                ...SECRET_SCAN_STATUS_GROUPS.inProgress,
                ...SECRET_SCAN_STATUS_GROUPS.starting,
              ],
            };
          } else {
            searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
              secret_scan_status: SECRET_SCAN_STATUS_GROUPS[secretScanStatus],
            };
          }
        }
        if (malwareScanStatus) {
          if (malwareScanStatus === MalwareScanGroupedStatus.neverScanned) {
            searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in,
              malware_scan_status: [
                ...MALWARE_SCAN_STATUS_GROUPS.complete,
                ...MALWARE_SCAN_STATUS_GROUPS.error,
                ...MALWARE_SCAN_STATUS_GROUPS.inProgress,
                ...MALWARE_SCAN_STATUS_GROUPS.starting,
              ],
            };
          } else {
            searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
              ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
              malware_scan_status: MALWARE_SCAN_STATUS_GROUPS[malwareScanStatus],
            };
          }
        }

        if (order) {
          searchSearchNodeReq.node_filter.filters.order_filter.order_fields?.push({
            field_name: order.sortBy,
            descending: order.descending,
          });
        }
        const searchContainersApi = apiWrapper({
          fn: getSearchApiClient().searchContainers,
        });
        const containersData = await searchContainersApi({
          searchSearchNodeReq,
        });
        if (!containersData.ok) {
          throw containersData.error;
        }

        const countContainersApi = apiWrapper({
          fn: getSearchApiClient().countContainers,
        });
        const containersDataCount = await countContainersApi({
          searchSearchNodeReq: {
            ...searchSearchNodeReq,
            window: {
              ...searchSearchNodeReq.window,
              size: 10 * searchSearchNodeReq.window.size,
            },
          },
        });

        if (!containersDataCount.ok) {
          throw containersDataCount.error;
        }

        if (containersData.value === null) {
          return {
            containers: [],
            currentPage: 0,
            totalRows: 0,
          };
        }
        return {
          containers: containersData.value,
          currentPage: page,
          totalRows: page * pageSize + containersDataCount.value.count,
        };
      },
    };
  },
  podsWithPagination: (filters: {
    page: number;
    pageSize: number;
    hosts: string[];
    clusters: string[];
    kubernetesStatus?: string;
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    return {
      queryKey: [filters],
      queryFn: async () => {
        const { page, pageSize, hosts, order, clusters, kubernetesStatus } = filters;
        const searchSearchNodeReq: SearchSearchNodeReq = {
          node_filter: {
            filters: {
              compare_filter: null,
              contains_filter: {
                filter_in: {
                  active: [true],
                  ...(hosts.length ? { host_name: hosts } : {}),
                  ...(clusters.length ? { kubernetes_cluster_name: clusters } : {}),
                },
              },
              match_filter: {
                filter_in: null,
              },
              order_filter: {
                order_fields: [],
              },
            },
            in_field_filter: null,
            window: {
              offset: 0,
              size: 0,
            },
          },
          window: { offset: page * pageSize, size: pageSize },
        };

        if (kubernetesStatus?.length) {
          let state = kubernetesStatus;
          if (kubernetesStatus === 'Not Running') {
            state = '';
          }
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
            ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
            kubernetes_state: [state],
          };
        }

        if (order) {
          searchSearchNodeReq.node_filter.filters.order_filter.order_fields?.push({
            field_name: order.sortBy,
            descending: order.descending,
          });
        }
        const searchPodsApi = apiWrapper({
          fn: getSearchApiClient().searchPods,
        });
        const podsData = await searchPodsApi({
          searchSearchNodeReq,
        });
        if (!podsData.ok) {
          throw podsData.error;
        }

        const countPodsApi = apiWrapper({
          fn: getSearchApiClient().countPods,
        });
        const podsDataCount = await countPodsApi({
          searchSearchNodeReq: {
            ...searchSearchNodeReq,
            window: {
              ...searchSearchNodeReq.window,
              size: 10 * searchSearchNodeReq.window.size,
            },
          },
        });

        if (!podsDataCount.ok) {
          throw podsDataCount.error;
        }

        if (podsDataCount.value === null) {
          return {
            pods: [],
            currentPage: 0,
            totalRows: 0,
          };
        }
        return {
          pods: podsData.value,
          currentPage: page,
          totalRows: page * pageSize + podsDataCount.value.count,
        };
      },
    };
  },
});
