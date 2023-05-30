import {
  getCloudNodesApiClient,
  getRegistriesApiClient,
  getSearchApiClient,
} from '@/api/api';
import { ModelCloudNodeProvidersListResp, SearchNodeCountResp } from '@/api/generated';
import { NodeCounts } from '@/features/dashboard/components/NodeCounts';
import { Posture } from '@/features/dashboard/components/Posture';
import { TopAttackPaths } from '@/features/dashboard/components/TopAttackPath';
import { TopRisksMalware } from '@/features/dashboard/components/TopRisksMalware';
import { TopRisksRuntimeDummy } from '@/features/dashboard/components/TopRisksRuntimeDummy';
import { TopRisksSecret } from '@/features/dashboard/components/TopRisksSecret';
import { TopRisksVulnerability } from '@/features/dashboard/components/TopRisksVulnerability';
import { apiWrapper } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';

async function getCloudNodeProviders(): Promise<ModelCloudNodeProvidersListResp> {
  const listCloudProvidersApi = apiWrapper({
    fn: getCloudNodesApiClient().listCloudProviders,
  });
  const result = await listCloudProvidersApi();

  if (!result.ok) {
    throw result.error;
  }

  if (!result.value.providers) {
    result.value.providers = [];
  }
  return result.value;
}

async function getRegistriesSummary(): Promise<number> {
  const getRegistriesSummary = apiWrapper({
    fn: getRegistriesApiClient().getRegistriesSummary,
  });

  const result = await getRegistriesSummary();

  if (!result.ok) {
    throw result.error;
  }
  if (result.value === null) {
    // TODO: handle this case with 404 status maybe
    throw new Error('Error getting registries');
  }
  let numRegistries = 0;
  for (const value of Object.values(result.value)) {
    numRegistries += value.registries ?? 0;
  }

  return numRegistries;
}

async function getNodeCounts(): Promise<SearchNodeCountResp> {
  const getNodeCountsApi = apiWrapper({
    fn: getSearchApiClient().getNodeCounts,
  });
  const result = await getNodeCountsApi();

  if (!result.ok) {
    throw result.error;
  }
  return result.value;
}

async function getTop5VulnerableAssetsData(): Promise<
  Array<{
    nodeName: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
    total: number;
  }>
> {
  const [top5Hosts, top5Containers, top5Images] = await Promise.all(
    [
      getSearchApiClient().searchHosts,
      getSearchApiClient().searchContainers,
      getSearchApiClient().searchContainerImages,
    ].map((apiFunction) => {
      const searchApi = apiWrapper({
        fn: apiFunction,
      });
      return searchApi({
        searchSearchNodeReq: {
          node_filter: {
            filters: {
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
                order_fields: [
                  {
                    field_name: 'vulnerabilities_count',
                    descending: true,
                  },
                ],
              },
              compare_filter: [
                {
                  field_name: 'vulnerabilities_count',
                  field_value: 0,
                  greater_than: true,
                },
              ],
            },
            in_field_filter: [],
            window: {
              offset: 0,
              size: 0,
            },
          },
          window: {
            offset: 0,
            size: 5,
          },
        },
      });
    }),
  );

  if (!top5Hosts.ok || !top5Containers.ok || !top5Images.ok) {
    throw new Error('error getting top 5 container images');
  }

  const searchVulnerabilityScanApi = apiWrapper({
    fn: getSearchApiClient().searchVulnerabilityScan,
  });
  const top5NodeScans = await searchVulnerabilityScanApi({
    searchSearchScanReq: {
      node_filters: {
        filters: {
          compare_filter: [],
          contains_filter: { filter_in: {} },
          match_filter: { filter_in: {} },
          order_filter: { order_fields: [] },
          not_contains_filter: { filter_in: {} },
        },
        in_field_filter: [],
        window: { offset: 0, size: 0 },
      },
      scan_filters: {
        filters: {
          compare_filter: [],
          contains_filter: {
            filter_in: {
              node_id: [
                ...top5Hosts.value
                  .map((node) => node.vulnerability_latest_scan_id)
                  .filter((scanId) => {
                    return !!scanId?.length;
                  }),
                ...top5Containers.value
                  .map((node) => node.vulnerability_latest_scan_id)
                  .filter((scanId) => {
                    return !!scanId?.length;
                  }),
                ...top5Images.value
                  .map((node) => node.vulnerability_latest_scan_id)
                  .filter((scanId) => {
                    return !!scanId?.length;
                  }),
              ],
            },
          },
          match_filter: { filter_in: {} },
          order_filter: { order_fields: [] },
          not_contains_filter: { filter_in: {} },
        },
        in_field_filter: [],
        window: { offset: 0, size: 0 },
      },
      window: {
        offset: 0,
        size: 15,
      },
    },
  });

  if (!top5NodeScans.ok) {
    throw new Error('error getting top 5 container image scans');
  }

  return [...top5Hosts.value, ...top5Containers.value, ...top5Images.value]
    .map((node) => {
      const latestScan = top5NodeScans.value?.find(
        (scan) => scan.node_id === node.node_id,
      );
      const critical = latestScan?.severity_counts?.critical ?? 0;
      const high = latestScan?.severity_counts?.high ?? 0;
      const medium = latestScan?.severity_counts?.medium ?? 0;
      const low = latestScan?.severity_counts?.low ?? 0;
      const unknown = latestScan?.severity_counts?.unknown ?? 0;
      const total = critical + high + medium + low + unknown;
      return {
        nodeName: node.node_name,
        critical,
        high,
        medium,
        low,
        unknown,
        total,
      };
    })
    .filter((node) => node.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

async function getVulnerabilitiesData() {
  const searchVulnerabilitiesCountApi = apiWrapper({
    fn: getSearchApiClient().searchVulnerabilitiesCount,
  });
  const uniqueVulenrabilityCounts = await searchVulnerabilitiesCountApi({
    searchSearchNodeReq: {
      node_filter: {
        filters: {
          contains_filter: { filter_in: {} },
          match_filter: { filter_in: {} },
          order_filter: { order_fields: [] },
          compare_filter: null,
        },
        in_field_filter: [],
        window: {
          offset: 0,
          size: 0,
        },
      },
      window: {
        offset: 0,
        size: 999999999,
      },
    },
  });

  if (!uniqueVulenrabilityCounts.ok) {
    // TODO handle error
    throw new Error('Error getting vulnerabilities counts');
  }

  return {
    total: uniqueVulenrabilityCounts.value.count,
    severityBreakdown: {
      critical: uniqueVulenrabilityCounts.value.categories?.['critical'] ?? 0,
      high: uniqueVulenrabilityCounts.value.categories?.['high'] ?? 0,
      medium: uniqueVulenrabilityCounts.value.categories?.['medium'] ?? 0,
      low: uniqueVulenrabilityCounts.value.categories?.['low'] ?? 0,
      unknown: uniqueVulenrabilityCounts.value.categories?.['unknown'] ?? 0,
    },
    top5Assets: await getTop5VulnerableAssetsData(),
  };
}

async function getTop5SecretAssetsData(): Promise<
  Array<{
    nodeName: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
    total: number;
  }>
> {
  const [top5Hosts, top5Containers, top5Images] = await Promise.all(
    [
      getSearchApiClient().searchHosts,
      getSearchApiClient().searchContainers,
      getSearchApiClient().searchContainerImages,
    ].map((apiFunction) => {
      const searchApi = apiWrapper({
        fn: apiFunction,
      });
      return searchApi({
        searchSearchNodeReq: {
          node_filter: {
            filters: {
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
                order_fields: [
                  {
                    field_name: 'secrets_count',
                    descending: true,
                  },
                ],
              },
              compare_filter: [
                {
                  field_name: 'secrets_count',
                  field_value: 0,
                  greater_than: true,
                },
              ],
            },
            in_field_filter: [],
            window: {
              offset: 0,
              size: 0,
            },
          },
          window: {
            offset: 0,
            size: 5,
          },
        },
      });
    }),
  );

  if (!top5Hosts.ok || !top5Containers.ok || !top5Images.ok) {
    throw new Error('error getting top 5 container images');
  }
  const searchSecretsScanApi = apiWrapper({
    fn: getSearchApiClient().searchSecretsScan,
  });
  const top5NodeScans = await searchSecretsScanApi({
    searchSearchScanReq: {
      node_filters: {
        filters: {
          compare_filter: [],
          contains_filter: { filter_in: {} },
          match_filter: { filter_in: {} },
          order_filter: { order_fields: [] },
          not_contains_filter: { filter_in: {} },
        },
        in_field_filter: [],
        window: { offset: 0, size: 0 },
      },
      scan_filters: {
        filters: {
          compare_filter: [],
          contains_filter: {
            filter_in: {
              node_id: [
                ...top5Hosts.value
                  .map((node) => node.secret_latest_scan_id)
                  .filter((scanId) => {
                    return !!scanId?.length;
                  }),
                ...top5Containers.value
                  .map((node) => node.secret_latest_scan_id)
                  .filter((scanId) => {
                    return !!scanId?.length;
                  }),
                ...top5Images.value
                  .map((node) => node.secret_latest_scan_id)
                  .filter((scanId) => {
                    return !!scanId?.length;
                  }),
              ],
            },
          },
          match_filter: { filter_in: {} },
          order_filter: { order_fields: [] },
          not_contains_filter: { filter_in: {} },
        },
        in_field_filter: [],
        window: { offset: 0, size: 0 },
      },
      window: {
        offset: 0,
        size: 15,
      },
    },
  });

  if (!top5NodeScans.ok) {
    throw new Error('error getting top 5 scans');
  }

  return [...top5Hosts.value, ...top5Containers.value, ...top5Images.value]
    .map((node) => {
      const latestScan = top5NodeScans.value?.find(
        (scan) => scan.node_id === node.node_id,
      );
      const critical = latestScan?.severity_counts?.critical ?? 0;
      const high = latestScan?.severity_counts?.high ?? 0;
      const medium = latestScan?.severity_counts?.medium ?? 0;
      const low = latestScan?.severity_counts?.low ?? 0;
      const unknown = latestScan?.severity_counts?.unknown ?? 0;
      const total = critical + high + medium + low + unknown;
      return {
        nodeName: node.node_name,
        critical,
        high,
        medium,
        low,
        unknown,
        total,
      };
    })
    .filter((node) => node.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

async function getSecretsData() {
  const searchSecretsCountApi = apiWrapper({
    fn: getSearchApiClient().searchSecretsCount,
  });
  const uniqueVulenrabilityCounts = await searchSecretsCountApi({
    searchSearchNodeReq: {
      node_filter: {
        filters: {
          contains_filter: { filter_in: {} },
          match_filter: { filter_in: {} },
          order_filter: { order_fields: [] },
          compare_filter: null,
        },
        in_field_filter: [],
        window: {
          offset: 0,
          size: 0,
        },
      },
      window: {
        offset: 0,
        size: 999999999,
      },
    },
  });

  if (!uniqueVulenrabilityCounts.ok) {
    // TODO handle error
    throw new Error('Error getting secrets counts');
  }

  return {
    total: uniqueVulenrabilityCounts.value.count,
    severityBreakdown: {
      critical: uniqueVulenrabilityCounts.value.categories?.['critical'] ?? 0,
      high: uniqueVulenrabilityCounts.value.categories?.['high'] ?? 0,
      medium: uniqueVulenrabilityCounts.value.categories?.['medium'] ?? 0,
      low: uniqueVulenrabilityCounts.value.categories?.['low'] ?? 0,
      unknown: uniqueVulenrabilityCounts.value.categories?.['unknown'] ?? 0,
    },
    top5Assets: await getTop5SecretAssetsData(),
  };
}

async function getTop5MalwaresAssetsData(): Promise<
  Array<{
    nodeName: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
    total: number;
  }>
> {
  const [top5Hosts, top5Containers, top5Images] = await Promise.all(
    [
      getSearchApiClient().searchHosts,
      getSearchApiClient().searchContainers,
      getSearchApiClient().searchContainerImages,
    ].map((apiFunction) => {
      const searchApi = apiWrapper({
        fn: apiFunction,
      });
      return searchApi({
        searchSearchNodeReq: {
          node_filter: {
            filters: {
              contains_filter: {
                filter_in: {
                  pseudo: [false],
                },
              },
              match_filter: {
                filter_in: {},
              },
              order_filter: {
                order_fields: [
                  {
                    field_name: 'malwares_count',
                    descending: true,
                  },
                ],
              },
              compare_filter: [
                {
                  field_name: 'malwares_count',
                  field_value: 0,
                  greater_than: true,
                },
              ],
            },
            in_field_filter: [],
            window: {
              offset: 0,
              size: 0,
            },
          },
          window: {
            offset: 0,
            size: 5,
          },
        },
      });
    }),
  );

  if (!top5Hosts.ok || !top5Containers.ok || !top5Images.ok) {
    throw new Error('error getting top 5 container images');
  }
  const searchMalwaresScanApi = apiWrapper({
    fn: getSearchApiClient().searchMalwaresScan,
  });
  const top5NodeScans = await searchMalwaresScanApi({
    searchSearchScanReq: {
      node_filters: {
        filters: {
          compare_filter: [],
          contains_filter: { filter_in: {} },
          match_filter: { filter_in: {} },
          order_filter: { order_fields: [] },
          not_contains_filter: { filter_in: {} },
        },
        in_field_filter: [],
        window: { offset: 0, size: 0 },
      },
      scan_filters: {
        filters: {
          compare_filter: [],
          contains_filter: {
            filter_in: {
              node_id: [
                ...top5Hosts.value
                  .map((node) => node.malware_latest_scan_id)
                  .filter((scanId) => {
                    return !!scanId?.length;
                  }),
                ...top5Containers.value
                  .map((node) => node.malware_latest_scan_id)
                  .filter((scanId) => {
                    return !!scanId?.length;
                  }),
                ...top5Images.value
                  .map((node) => node.malware_latest_scan_id)
                  .filter((scanId) => {
                    return !!scanId?.length;
                  }),
              ],
            },
          },
          match_filter: { filter_in: {} },
          order_filter: { order_fields: [] },
          not_contains_filter: { filter_in: {} },
        },
        in_field_filter: [],
        window: { offset: 0, size: 0 },
      },
      window: {
        offset: 0,
        size: 15,
      },
    },
  });

  if (!top5NodeScans.ok) {
    throw new Error('error getting top 5 scans');
  }

  return [...top5Hosts.value, ...top5Containers.value, ...top5Images.value]
    .map((node) => {
      const latestScan = top5NodeScans.value.find(
        (scan) => scan.node_id === node.node_id,
      );
      const critical = latestScan?.severity_counts?.critical ?? 0;
      const high = latestScan?.severity_counts?.high ?? 0;
      const medium = latestScan?.severity_counts?.medium ?? 0;
      const low = latestScan?.severity_counts?.low ?? 0;
      const unknown = latestScan?.severity_counts?.unknown ?? 0;
      const total = critical + high + medium + low + unknown;
      return {
        nodeName: node.node_name,
        critical,
        high,
        medium,
        low,
        unknown,
        total,
      };
    })
    .filter((node) => node.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

async function getMalwaresData() {
  const searchMalwaresCountApi = apiWrapper({
    fn: getSearchApiClient().searchMalwaresCount,
  });
  const uniqueVulenrabilityCounts = await searchMalwaresCountApi({
    searchSearchNodeReq: {
      node_filter: {
        filters: {
          contains_filter: { filter_in: {} },
          match_filter: { filter_in: {} },
          order_filter: { order_fields: [] },
          compare_filter: null,
        },
        in_field_filter: [],
        window: {
          offset: 0,
          size: 0,
        },
      },
      window: {
        offset: 0,
        size: 999999999,
      },
    },
  });

  if (!uniqueVulenrabilityCounts.ok) {
    // TODO handle error
    throw new Error('Error getting secrets counts');
  }

  return {
    total: uniqueVulenrabilityCounts.value.count,
    severityBreakdown: {
      critical: uniqueVulenrabilityCounts.value.categories?.['critical'] ?? 0,
      high: uniqueVulenrabilityCounts.value.categories?.['high'] ?? 0,
      medium: uniqueVulenrabilityCounts.value.categories?.['medium'] ?? 0,
      low: uniqueVulenrabilityCounts.value.categories?.['low'] ?? 0,
      unknown: uniqueVulenrabilityCounts.value.categories?.['unknown'] ?? 0,
    },
    top5Assets: await getTop5MalwaresAssetsData(),
  };
}

type TopRisksCardData = {
  total: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
  top5Assets: Array<{
    nodeName: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
    total: number;
  }>;
};

export type DashboardLoaderData = {
  cloudProviders: Awaited<ReturnType<typeof getCloudNodeProviders>>;
  registries: Awaited<ReturnType<typeof getRegistriesSummary>>;
  nodeCounts: Awaited<ReturnType<typeof getNodeCounts>>;
  vulnerabilitiesData: Awaited<TopRisksCardData>;
  secretsData: Awaited<TopRisksCardData>;
  malwaresData: Awaited<TopRisksCardData>;
};

const loader = async (): Promise<TypedDeferredData<DashboardLoaderData>> => {
  return typedDefer({
    cloudProviders: getCloudNodeProviders(),
    registries: getRegistriesSummary(),
    nodeCounts: getNodeCounts(),
    vulnerabilitiesData: getVulnerabilitiesData(),
    secretsData: getSecretsData(),
    malwaresData: getMalwaresData(),
  });
};

const Dashboard = () => {
  return (
    <div className="overflow-auto">
      <NodeCounts />
      <div className="grid grid-cols-2 2xl:grid-cols-3 gap-2 auto-rows-auto px-2 last:mb-2">
        <TopAttackPaths />
        <Posture />
        <TopRisksRuntimeDummy />
        <TopRisksVulnerability />
        <TopRisksSecret />
        <TopRisksMalware />
      </div>
    </div>
  );
};

export const module = {
  element: <Dashboard />,
  loader,
};
