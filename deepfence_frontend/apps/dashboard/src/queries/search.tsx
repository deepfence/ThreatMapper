import { createQueryKeys } from '@lukemorales/query-key-factory';
import { isNil } from 'lodash-es';

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
    agentRunning?: boolean;
    showOnlyKubernetesHosts?: boolean;
    order?: {
      sortBy: string;
      descending: boolean;
    };
    isScannedForVulnerabilities?: boolean;
    isScannedForSecrets?: boolean;
    isScannedForMalware?: boolean;
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
        const {
          searchText,
          size,
          active,
          agentRunning,
          showOnlyKubernetesHosts,
          order,
          isScannedForVulnerabilities,
          isScannedForSecrets,
          isScannedForMalware,
        } = filters;
        const searchSearchNodeReq: SearchSearchNodeReq = {
          node_filter: {
            filters: {
              contains_filter: {
                filter_in: {
                  pseudo: [false],
                  ...(active && { active: [active === true] }),
                },
              },
              not_contains_filter: {
                filter_in: {},
              },
              order_filter: {
                order_fields: [
                  {
                    field_name: 'updated_at',
                    descending: true,
                  },
                ],
              },
              match_filter: { filter_in: {} },
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
        };
        if (order) {
          searchSearchNodeReq.node_filter.filters.order_filter.order_fields = [
            {
              field_name: order.sortBy,
              descending: order.descending,
            },
          ];
        }
        if (searchText?.length) {
          searchSearchNodeReq.node_filter.filters.match_filter.filter_in = {
            node_name: [searchText],
          };
        }
        if (!isNil(agentRunning) && agentRunning) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in![
            'agent_running'
          ] = [agentRunning];
        }
        if (showOnlyKubernetesHosts) {
          searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in![
            'kubernetes_cluster_id'
          ] = [''];
        }
        if (isScannedForVulnerabilities) {
          searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in![
            'vulnerability_scan_status'
          ] = [...VULNERABILITY_SCAN_STATUS_GROUPS.neverScanned, ''];
        }
        if (isScannedForSecrets) {
          searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in![
            'secret_scan_status'
          ] = [...SECRET_SCAN_STATUS_GROUPS.neverScanned, ''];
        }
        if (isScannedForMalware) {
          searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in![
            'malware_scan_status'
          ] = [...MALWARE_SCAN_STATUS_GROUPS.neverScanned, ''];
        }
        const searchHostsApi = apiWrapper({
          fn: getSearchApiClient().searchHosts,
        });
        const searchHostsResponse = await searchHostsApi({
          searchSearchNodeReq,
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
  pods: (filters: {
    searchText?: string;
    size: number;
    active?: boolean;
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async ({
        pageParam = 0,
      }): Promise<{
        pods: {
          nodeId: string;
          podName: string;
        }[];
      }> => {
        const { searchText, size, active, order } = filters;
        const searchSearchNodeReq: SearchSearchNodeReq = {
          node_filter: {
            filters: {
              contains_filter: {
                filter_in: {
                  pseudo: [false],
                  ...(active && { active: [active === true] }),
                },
              },
              not_contains_filter: {
                filter_in: {},
              },
              order_filter: {
                order_fields: [
                  {
                    field_name: 'updated_at',
                    descending: true,
                  },
                ],
              },
              match_filter: { filter_in: {} },
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
        };
        if (order) {
          searchSearchNodeReq.node_filter.filters.order_filter.order_fields = [
            {
              field_name: order.sortBy,
              descending: order.descending,
            },
          ];
        }
        if (searchText?.length) {
          searchSearchNodeReq.node_filter.filters.match_filter.filter_in = {
            pod_name: [searchText],
          };
        }

        const searchPodsApi = apiWrapper({
          fn: getSearchApiClient().searchPods,
        });
        const searchPodsResponse = await searchPodsApi({
          searchSearchNodeReq,
        });
        if (!searchPodsResponse.ok) {
          throw searchPodsResponse.error;
        }
        if (searchPodsResponse.value === null) {
          return {
            pods: [],
          };
        }
        return {
          pods: searchPodsResponse.value.slice(0, size).map((res) => {
            return {
              nodeId: res.node_id,
              podName: res.pod_name,
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
    isScannedForVulnerabilities?: boolean;
    isScannedForSecrets?: boolean;
    isScannedForMalware?: boolean;
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async ({
        pageParam = 0,
      }): Promise<{
        containers: {
          nodeId: string;
          nodeName: string;
        }[];
      }> => {
        const {
          searchText,
          size,
          active,
          order,
          isScannedForVulnerabilities,
          isScannedForSecrets,
          isScannedForMalware,
        } = filters;
        const matchFilter = { filter_in: {} };
        if (searchText?.length) {
          matchFilter.filter_in = {
            node_name: [searchText],
          };
        }

        const searchContainersApi = apiWrapper({
          fn: getSearchApiClient().searchContainers,
        });

        const scanRequestParams: SearchSearchNodeReq = {
          node_filter: {
            filters: {
              contains_filter: {
                filter_in: {
                  pseudo: [false],
                  ...(active && { active: [active === true] }),
                },
              },
              not_contains_filter: {
                filter_in: {},
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
        };

        if (isScannedForVulnerabilities) {
          scanRequestParams.node_filter.filters.not_contains_filter!.filter_in![
            'vulnerability_scan_status'
          ] = [...VULNERABILITY_SCAN_STATUS_GROUPS.neverScanned, ''];
        }
        if (isScannedForSecrets) {
          scanRequestParams.node_filter.filters.not_contains_filter!.filter_in![
            'secret_scan_status'
          ] = [...SECRET_SCAN_STATUS_GROUPS.neverScanned, ''];
        }
        if (isScannedForMalware) {
          scanRequestParams.node_filter.filters.not_contains_filter!.filter_in![
            'malware_scan_status'
          ] = [...MALWARE_SCAN_STATUS_GROUPS.neverScanned, ''];
        }
        if (order) {
          scanRequestParams.node_filter.filters.order_filter.order_fields = [
            {
              field_name: order.sortBy,
              descending: order.descending,
            },
          ];
        }
        const searchContainersResponse = await searchContainersApi({
          searchSearchNodeReq: scanRequestParams,
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
              nodeName: res.node_name,
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
    isScannedForVulnerabilities?: boolean;
    isScannedForSecrets?: boolean;
    isScannedForMalware?: boolean;
    order?: {
      sortBy: string;
      descending: boolean;
    };
    filter?: {
      dockerImageName: string;
    };
  }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async ({
        pageParam = 0,
      }): Promise<{
        containerImages: {
          nodeId: string;
          nodeName: string;
          tagList: string[];
        }[];
      }> => {
        const {
          searchText,
          size,
          active,
          order,
          filter,
          isScannedForVulnerabilities,
          isScannedForSecrets,
          isScannedForMalware,
        } = filters;
        const searchContainerImagesApi = apiWrapper({
          fn: getSearchApiClient().searchContainerImages,
        });

        const scanRequestParams: SearchSearchNodeReq = {
          node_filter: {
            filters: {
              contains_filter: {
                filter_in: {
                  pseudo: [false],
                  ...(active && { active: [active === true] }),
                },
              },
              not_contains_filter: {
                filter_in: {},
              },
              order_filter: {
                order_fields: [
                  {
                    field_name: 'updated_at',
                    descending: true,
                  },
                ],
              },
              match_in_array_filter: {
                filter_in: {},
              },
              match_filter: {
                filter_in: {},
              },
              compare_filter: null,
            },
            in_field_filter: ['node_id', 'node_name', 'docker_image_tag_list'],
            window: {
              offset: 0,
              size: 0,
            },
          },
          window: {
            offset: pageParam,
            size,
          },
        };

        if (searchText?.trim()?.length) {
          scanRequestParams.node_filter.filters!.match_in_array_filter!.filter_in![
            'docker_image_tag_list'
          ] = [searchText];
        }

        if (filter?.dockerImageName && filter?.dockerImageName?.length) {
          scanRequestParams.node_filter.filters!.contains_filter!.filter_in![
            'docker_image_name'
          ] = [filter?.dockerImageName];
        }

        if (isScannedForVulnerabilities) {
          scanRequestParams.node_filter.filters.not_contains_filter!.filter_in![
            'vulnerability_scan_status'
          ] = [...VULNERABILITY_SCAN_STATUS_GROUPS.neverScanned, ''];
        }
        if (isScannedForSecrets) {
          scanRequestParams.node_filter.filters.not_contains_filter!.filter_in![
            'secret_scan_status'
          ] = [...SECRET_SCAN_STATUS_GROUPS.neverScanned, ''];
        }
        if (isScannedForMalware) {
          scanRequestParams.node_filter.filters.not_contains_filter!.filter_in![
            'malware_scan_status'
          ] = [...MALWARE_SCAN_STATUS_GROUPS.neverScanned, ''];
        }

        if (order) {
          scanRequestParams.node_filter.filters.order_filter.order_fields = [
            {
              field_name: order.sortBy,
              descending: order.descending,
            },
          ];
        }
        const searchContainerImagesResponse = await searchContainerImagesApi({
          searchSearchNodeReq: scanRequestParams,
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
                nodeName: res.node_name,
                tagList: res.docker_image_tag_list ?? [],
              };
            }),
        };
      },
    };
  },
  clusters: (filters: {
    searchText?: string;
    size: number;
    active?: boolean;
    agentRunning?: boolean;
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
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
        const { searchText, size, active, agentRunning, order } = filters;

        const searchSearchNodeReq: SearchSearchNodeReq = {
          node_filter: {
            filters: {
              compare_filter: null,
              contains_filter: {
                filter_in: {
                  pseudo: [false],
                  ...(active && { active: [active === true] }),
                },
              },
              match_filter: {
                filter_in: {},
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
          window: {
            offset: pageParam,
            size,
          },
        };

        if (order) {
          searchSearchNodeReq.node_filter.filters.order_filter.order_fields = [
            {
              field_name: order.sortBy,
              descending: order.descending,
            },
          ];
        }

        if (searchText?.length) {
          searchSearchNodeReq.node_filter.filters.match_filter.filter_in = {
            node_name: [searchText],
          };
        }
        if (!isNil(agentRunning) && agentRunning) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in![
            'agent_running'
          ] = [agentRunning];
        }
        const searchKubernetesClustersApi = apiWrapper({
          fn: getSearchApiClient().searchKubernetesClusters,
        });
        const searchKubernetesClustersResponse = await searchKubernetesClustersApi({
          searchSearchNodeReq,
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
  cloudAccounts: (filters: {
    searchText?: string;
    size: number;
    active?: boolean;
    cloudProvider?: string;
  }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async ({
        pageParam = 0,
      }): Promise<{
        accounts: {
          nodeId: string;
          nodeName: string;
        }[];
      }> => {
        const { searchText, size, active, cloudProvider } = filters;
        const matchFilter = { filter_in: {} };
        if (searchText?.length) {
          matchFilter.filter_in = {
            node_name: [searchText],
          };
        }
        const searchSearchNodeReq = {
          node_filter: {
            filters: {
              contains_filter: {
                filter_in: {
                  ...(active && { active: [active === true] }),
                  ...(cloudProvider && { cloud_provider: [cloudProvider] }),
                },
              },
              order_filter: {
                order_fields: [
                  {
                    field_name: 'node_name',
                    descending: false,
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
        };
        const searchCloudAccountsApi = apiWrapper({
          fn: getSearchApiClient().searchCloudAccounts,
        });
        const searchCloudAccountsResponse = await searchCloudAccountsApi({
          searchSearchNodeReq,
        });
        if (!searchCloudAccountsResponse.ok) {
          throw searchCloudAccountsResponse.error;
        }
        if (searchCloudAccountsResponse.value === null) {
          return {
            accounts: [],
          };
        }
        return {
          accounts: searchCloudAccountsResponse.value.map((res) => {
            return {
              nodeId: res.node_id ?? '',
              nodeName: res.node_name ?? '',
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
    agentRunning?: boolean[];
    cloudAccounts?: string[];
    clusterIds: string[];
    hosts: string[];
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
          agentRunning,
          cloudAccounts,
          clusterIds,
          hosts,
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
        if (clusterIds?.length) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
            ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
            kubernetes_cluster_id: clusterIds,
          };
        }
        if (hosts?.length) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
            ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
            node_id: hosts,
          };
        }
        if (cloudProvider?.length) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
            ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
            cloud_provider: cloudProvider,
          };
        }
        if (cloudAccounts?.length) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
            ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
            cloud_account_id: cloudAccounts,
          };
        }
        if (order) {
          searchSearchNodeReq.node_filter.filters.order_filter.order_fields?.push({
            field_name: order.sortBy,
            descending: order.descending,
          });
        }

        if (agentRunning?.length) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
            ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
            agent_running: agentRunning,
          };
        }

        const getThreatGraphApi = apiWrapper({
          fn: getSearchApiClient().searchHosts,
        });
        const hostsDataPromise = getThreatGraphApi({
          searchSearchNodeReq,
        });

        const searchHostsCountApi = apiWrapper({
          fn: getSearchApiClient().searchHostsCount,
        });
        const hostsDataCountPromise = searchHostsCountApi({
          searchSearchNodeReq: {
            ...searchSearchNodeReq,
            window: {
              ...searchSearchNodeReq.window,
              size: 10 * searchSearchNodeReq.window.size,
            },
          },
        });

        const [hostsData, hostsDataCount] = await Promise.all([
          hostsDataPromise,
          hostsDataCountPromise,
        ]);

        if (!hostsData.ok) {
          throw hostsData;
        }
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
    agentRunning?: boolean[];
    clusterIds?: string[];
  }) => {
    return {
      queryKey: [filters],
      queryFn: async () => {
        const { page, pageSize, order, agentRunning, clusterIds } = filters;
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
        if (agentRunning?.length) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
            ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
            agent_running: agentRunning,
          };
        }
        if (clusterIds?.length) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
            ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
            kubernetes_cluster_id: clusterIds,
          };
        }
        const searchKubernetesClustersApi = apiWrapper({
          fn: getSearchApiClient().searchKubernetesClusters,
        });
        const clusterDataPromise = searchKubernetesClustersApi({
          searchSearchNodeReq,
        });

        const countKubernetesClustersApi = apiWrapper({
          fn: getSearchApiClient().countKubernetesClusters,
        });
        const clustersDataCountPromise = countKubernetesClustersApi({
          searchSearchNodeReq: {
            ...searchSearchNodeReq,
            window: {
              ...searchSearchNodeReq.window,
              size: 10 * searchSearchNodeReq.window.size,
            },
          },
        });

        const [clusterData, clustersDataCount] = await Promise.all([
          clusterDataPromise,
          clustersDataCountPromise,
        ]);

        if (!clusterData.ok) {
          throw clusterData.error;
        }

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
    clusterIds: string[];
    containers: string[];
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
          clusterIds,
          containers,
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
        if (clusterIds?.length) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
            ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
            kubernetes_cluster_id: clusterIds,
          };
        }
        if (containers?.length) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
            ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
            node_id: containers,
          };
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
        const containersDataPromise = searchContainersApi({
          searchSearchNodeReq,
        });

        const countContainersApi = apiWrapper({
          fn: getSearchApiClient().countContainers,
        });
        const containersDataCountPromise = countContainersApi({
          searchSearchNodeReq: {
            ...searchSearchNodeReq,
            window: {
              ...searchSearchNodeReq.window,
              size: 10 * searchSearchNodeReq.window.size,
            },
          },
        });

        const [containersData, containersDataCount] = await Promise.all([
          containersDataPromise,
          containersDataCountPromise,
        ]);

        if (!containersData.ok) {
          throw containersData.error;
        }

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
    clusterNames: string[];
    pods: string[];
    kubernetesStatus?: string;
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    return {
      queryKey: [filters],
      queryFn: async () => {
        const { page, pageSize, hosts, pods, order, clusterNames, kubernetesStatus } =
          filters;
        const searchSearchNodeReq: SearchSearchNodeReq = {
          node_filter: {
            filters: {
              compare_filter: null,
              contains_filter: {
                filter_in: {
                  active: [true],
                  ...(hosts.length ? { host_name: hosts } : {}),
                  ...(clusterNames.length
                    ? { kubernetes_cluster_name: clusterNames }
                    : {}),
                  ...(pods.length ? { pod_name: pods } : {}),
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
        const podsDataPromise = searchPodsApi({
          searchSearchNodeReq,
        });

        const countPodsApi = apiWrapper({
          fn: getSearchApiClient().countPods,
        });
        const podsDataCountPromise = countPodsApi({
          searchSearchNodeReq: {
            ...searchSearchNodeReq,
            window: {
              ...searchSearchNodeReq.window,
              size: 10 * searchSearchNodeReq.window.size,
            },
          },
        });

        const [podsData, podsDataCount] = await Promise.all([
          podsDataPromise,
          podsDataCountPromise,
        ]);

        if (!podsData.ok) {
          throw podsData.error;
        }

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
  cloudResourcesWithPagination: (filters: {
    resourceId?: string;
    page: number;
    pageSize: number;
    cloudRegion?: string;
    cloudProvider?: string[];
    serviceType?: string[];
    awsAccountId?: string[];
    gcpAccountId?: string[];
    azureAccountId?: string[];
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    return {
      queryKey: [filters],
      queryFn: async () => {
        const {
          resourceId,
          page,
          pageSize,
          cloudRegion,
          order,
          cloudProvider,
          serviceType,
          awsAccountId,
          gcpAccountId,
          azureAccountId,
        } = filters;
        const searchSearchNodeReq: SearchSearchNodeReq = {
          node_filter: {
            filters: {
              compare_filter: [],
              match_filter: {
                filter_in: {},
              },
              contains_filter: { filter_in: {} },
              order_filter: { order_fields: [] },
              not_contains_filter: { filter_in: {} },
              contains_in_array_filter: { filter_in: {} },
            },
            in_field_filter: [],
            window: {
              offset: 0,
              size: 0,
            },
          },
          window: { offset: page * pageSize, size: pageSize },
        };

        if (resourceId) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in![
            'resource_id'
          ] = [resourceId];
        }
        if (cloudRegion) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in![
            'cloud_region'
          ] = [cloudRegion];
        }

        if (cloudProvider?.length) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in![
            'cloud_provider'
          ] = cloudProvider;
        }
        if (serviceType?.length) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in![
            'node_type'
          ] = serviceType;
        }

        let accounts: string[] = [];
        if (awsAccountId?.length) {
          accounts = [...accounts, ...awsAccountId];
        }
        if (gcpAccountId?.length) {
          accounts = [...accounts, ...gcpAccountId];
        }
        if (azureAccountId?.length) {
          accounts = [...accounts, ...azureAccountId];
        }
        if (accounts.length) {
          searchSearchNodeReq.node_filter.filters.contains_filter.filter_in![
            'account_id'
          ] = accounts;
        }

        if (order) {
          searchSearchNodeReq.node_filter.filters.order_filter.order_fields?.push({
            field_name: order.sortBy,
            descending: order.descending,
          });
        }

        const searchCloudResourcesApi = apiWrapper({
          fn: getSearchApiClient().searchCloudResources,
        });
        const resourcesPromises = searchCloudResourcesApi({
          searchSearchNodeReq,
        });

        const searchCloudResourcesCountApi = apiWrapper({
          fn: getSearchApiClient().searchCloudResourcesCount,
        });
        const resourcesCountPromise = searchCloudResourcesCountApi({
          searchSearchNodeReq: {
            ...searchSearchNodeReq,
            window: {
              ...searchSearchNodeReq.window,
              size: 10 * searchSearchNodeReq.window.size,
            },
          },
        });

        const [resourcesResults, resourcesCountResults] = await Promise.all([
          resourcesPromises,
          resourcesCountPromise,
        ]);

        if (!resourcesResults.ok) {
          throw new Error(`Failed to load cloud resoures : ${resourceId}`);
        }

        if (!resourcesCountResults.ok) {
          throw new Error(`Failed to load cloud resoures count : ${resourceId}`);
        }

        return {
          resources: resourcesResults.value,
          currentPage: page,
          totalRows: page * pageSize + resourcesCountResults.value.count,
        };
      },
    };
  },
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
  cloudResourcesCount: () => {
    return {
      queryKey: ['cloudResourcesCount'],
      queryFn: async () => {
        const searchCloudResourcesCountApi = apiWrapper({
          fn: getSearchApiClient().searchCloudResourcesCount,
        });
        const resourcesCountResults = await searchCloudResourcesCountApi({
          searchSearchNodeReq: {
            node_filter: {
              filters: {
                compare_filter: [],
                contains_filter: { filter_in: {} },
                match_filter: { filter_in: {} },
                order_filter: { order_fields: [] },
              },
              in_field_filter: [],
              window: {
                offset: 0,
                size: 0,
              },
            },
            window: {
              offset: 0,
              size: Number.MAX_SAFE_INTEGER,
            },
          },
        });

        if (!resourcesCountResults.ok) {
          throw new Error('Node counts failed');
        }
        return resourcesCountResults.value.count;
      },
    };
  },
  registryAccounts: (filters: {
    searchText?: string;
    size: number;
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async ({
        pageParam = 0,
      }): Promise<{
        registryAccounts: {
          nodeId: string;
          nodeName: string;
          registryType: string;
        }[];
      }> => {
        const { searchText, size, order } = filters;
        const matchFilter = { filter_in: {} };
        if (searchText?.length) {
          matchFilter.filter_in = {
            node_id: [searchText],
          };
        }

        const searchRegistryAccountsApi = apiWrapper({
          fn: getSearchApiClient().searchRegistryAccounts,
        });

        const scanRequestParams: SearchSearchNodeReq = {
          node_filter: {
            filters: {
              contains_filter: {
                filter_in: {},
              },
              not_contains_filter: {
                filter_in: {},
              },
              order_filter: {
                order_fields: [
                  {
                    field_name: 'node_id',
                    descending: false,
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
        };
        if (order) {
          scanRequestParams.node_filter.filters.order_filter.order_fields = [
            {
              field_name: order.sortBy,
              descending: order.descending,
            },
          ];
        }
        const searchRegistryAccountsResponse = await searchRegistryAccountsApi({
          searchSearchNodeReq: scanRequestParams,
        });
        if (!searchRegistryAccountsResponse.ok) {
          throw searchRegistryAccountsResponse.error;
        }

        if (searchRegistryAccountsResponse.value === null) {
          return {
            registryAccounts: [],
          };
        }
        return {
          registryAccounts: searchRegistryAccountsResponse.value
            .slice(0, size)
            .map((res) => {
              return {
                nodeId: res.node_id,
                nodeName: res.name,
                registryType: res.registry_type,
              };
            }),
        };
      },
    };
  },
});
