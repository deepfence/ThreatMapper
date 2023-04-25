import {
  getCloudNodesApiClient,
  getMalwareApiClient,
  getRegistriesApiClient,
  getSearchApiClient,
  getSecretApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelCloudNodeProvidersListResp,
  ModelNodeIdentifierNodeTypeEnum,
  ModelSummary,
  SearchNodeCountResp,
} from '@/api/generated';
import { NodeCounts } from '@/features/dashboard/components/NodeCounts';
import { Posture } from '@/features/dashboard/components/Posture';
import { Registries } from '@/features/dashboard/components/Registries';
import { ThreatStrykerBanner } from '@/features/dashboard/components/ThreatStrykerBanner';
import { TopAttackPaths } from '@/features/dashboard/components/TopAttackPath';
import { TopRisksMalware } from '@/features/dashboard/components/TopRisksMalware';
import { TopRisksSecret } from '@/features/dashboard/components/TopRisksSecret';
import { TopRisksVulnerability } from '@/features/dashboard/components/TopRisksVulnerability';
import { RegistryType } from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';

async function getCloudNodeProviders(): Promise<ModelCloudNodeProvidersListResp> {
  const result = await makeRequest({
    apiFunction: getCloudNodesApiClient().listCloudProviders,
    apiArgs: [],
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }

  if (!result.providers) {
    result.providers = [];
  }
  return result;
}
interface RegistryResponseType extends ModelSummary {
  type: string;
}

async function getRegistriesSummary(): Promise<RegistryResponseType[]> {
  const result = await makeRequest({
    apiFunction: getRegistriesApiClient().getRegistriesSummary,
    apiArgs: [],
    errorHandler: async (r) => {
      const error = new ApiError<{ message?: string }>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }
  if (result === null) {
    // TODO: handle this case with 404 status maybe
    throw new Error('Error getting registries');
  }
  type Keys = keyof typeof RegistryType;
  type ReponseType = { [K in Keys]: RegistryResponseType };
  const response: RegistryResponseType[] = [];
  for (const [key, value] of Object.entries(result as ReponseType)) {
    response.push({
      registries: value.registries,
      images: value.images,
      tags: value.tags,
      type: key,
    });
  }

  return response;
}

async function getNodeCounts(): Promise<SearchNodeCountResp> {
  const result = await makeRequest({
    apiFunction: getSearchApiClient().getNodeCounts,
    apiArgs: [],
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }
  return result;
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
      return makeRequest({
        apiFunction,
        apiArgs: [
          {
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
                        field_name: 'vulnerabilities_count',
                        descending: true,
                      },
                    ],
                  },
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
                size: 5,
              },
            },
          },
        ],
      });
    }),
  );

  if (
    ApiError.isApiError(top5Hosts) ||
    ApiError.isApiError(top5Containers) ||
    ApiError.isApiError(top5Images)
  ) {
    throw new Error('error getting top 5 container images');
  }

  const top5NodeScans = await makeRequest({
    apiFunction: getVulnerabilityApiClient().listVulnerabilityScans,
    apiArgs: [
      {
        modelScanListReq: {
          fields_filter: {
            contains_filter: {
              filter_in: {},
            },
            match_filter: { filter_in: {} },
            order_filter: { order_fields: [] },
            compare_filter: null,
          },
          scan_status: ['COMPLETE'],
          node_ids: [
            ...top5Hosts.map((node) => {
              return {
                node_id: node.node_id,
                node_type: ModelNodeIdentifierNodeTypeEnum.Host,
              };
            }),
            ...top5Containers.map((node) => {
              return {
                node_id: node.node_id,
                node_type: ModelNodeIdentifierNodeTypeEnum.Container,
              };
            }),
            ...top5Images.map((node) => {
              return {
                node_id: node.node_id,
                node_type: ModelNodeIdentifierNodeTypeEnum.Image,
              };
            }),
          ],
          window: {
            offset: 0,
            size: 1,
          },
        },
      },
    ],
  });
  if (ApiError.isApiError(top5NodeScans)) {
    throw new Error('error getting top 5 container image scans');
  }

  return [...top5Hosts, ...top5Containers, ...top5Images]
    .map((node) => {
      const latestScan = top5NodeScans.scans_info?.find(
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
  const uniqueVulenrabilityCounts = await makeRequest({
    apiFunction: getSearchApiClient().searchVulnerabilitiesCount,
    apiArgs: [
      {
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
      },
    ],
  });

  if (ApiError.isApiError(uniqueVulenrabilityCounts)) {
    // TODO handle error
    throw new Error('Error getting vulnerabilities counts');
  }

  return {
    total: uniqueVulenrabilityCounts.count,
    severityBreakdown: {
      critical: uniqueVulenrabilityCounts.categories?.['critical'] ?? 0,
      high: uniqueVulenrabilityCounts.categories?.['high'] ?? 0,
      medium: uniqueVulenrabilityCounts.categories?.['medium'] ?? 0,
      low: uniqueVulenrabilityCounts.categories?.['low'] ?? 0,
      unknown: uniqueVulenrabilityCounts.categories?.['unknown'] ?? 0,
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
      return makeRequest({
        apiFunction,
        apiArgs: [
          {
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
                        field_name: 'secrets_count',
                        descending: true,
                      },
                    ],
                  },
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
                size: 5,
              },
            },
          },
        ],
      });
    }),
  );

  if (
    ApiError.isApiError(top5Hosts) ||
    ApiError.isApiError(top5Containers) ||
    ApiError.isApiError(top5Images)
  ) {
    throw new Error('error getting top 5 container images');
  }

  const top5NodeScans = await makeRequest({
    apiFunction: getSecretApiClient().listSecretScans,
    apiArgs: [
      {
        modelScanListReq: {
          fields_filter: {
            contains_filter: {
              filter_in: {},
            },
            match_filter: { filter_in: {} },
            order_filter: { order_fields: [] },
            compare_filter: null,
          },
          scan_status: ['COMPLETE'],
          node_ids: [
            ...top5Hosts.map((node) => {
              return {
                node_id: node.node_id,
                node_type: ModelNodeIdentifierNodeTypeEnum.Host,
              };
            }),
            ...top5Containers.map((node) => {
              return {
                node_id: node.node_id,
                node_type: ModelNodeIdentifierNodeTypeEnum.Container,
              };
            }),
            ...top5Images.map((node) => {
              return {
                node_id: node.node_id,
                node_type: ModelNodeIdentifierNodeTypeEnum.Image,
              };
            }),
          ],
          window: {
            offset: 0,
            size: 1,
          },
        },
      },
    ],
  });
  if (ApiError.isApiError(top5NodeScans)) {
    throw new Error('error getting top 5 container image scans');
  }

  return [...top5Hosts, ...top5Containers, ...top5Images]
    .map((node) => {
      const latestScan = top5NodeScans.scans_info?.find(
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
  const uniqueVulenrabilityCounts = await makeRequest({
    apiFunction: getSearchApiClient().searchSecretsCount,
    apiArgs: [
      {
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
      },
    ],
  });

  if (ApiError.isApiError(uniqueVulenrabilityCounts)) {
    // TODO handle error
    throw new Error('Error getting secrets counts');
  }

  return {
    total: uniqueVulenrabilityCounts.count,
    severityBreakdown: {
      critical: uniqueVulenrabilityCounts.categories?.['critical'] ?? 0,
      high: uniqueVulenrabilityCounts.categories?.['high'] ?? 0,
      medium: uniqueVulenrabilityCounts.categories?.['medium'] ?? 0,
      low: uniqueVulenrabilityCounts.categories?.['low'] ?? 0,
      unknown: uniqueVulenrabilityCounts.categories?.['unknown'] ?? 0,
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
      return makeRequest({
        apiFunction,
        apiArgs: [
          {
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
                size: 5,
              },
            },
          },
        ],
      });
    }),
  );

  if (
    ApiError.isApiError(top5Hosts) ||
    ApiError.isApiError(top5Containers) ||
    ApiError.isApiError(top5Images)
  ) {
    throw new Error('error getting top 5 container images');
  }

  const top5NodeScans = await makeRequest({
    apiFunction: getMalwareApiClient().listMalwareScans,
    apiArgs: [
      {
        modelScanListReq: {
          fields_filter: {
            contains_filter: {
              filter_in: {},
            },
            match_filter: { filter_in: {} },
            order_filter: { order_fields: [] },
            compare_filter: null,
          },
          scan_status: ['COMPLETE'],
          node_ids: [
            ...top5Hosts.map((node) => {
              return {
                node_id: node.node_id,
                node_type: ModelNodeIdentifierNodeTypeEnum.Host,
              };
            }),
            ...top5Containers.map((node) => {
              return {
                node_id: node.node_id,
                node_type: ModelNodeIdentifierNodeTypeEnum.Container,
              };
            }),
            ...top5Images.map((node) => {
              return {
                node_id: node.node_id,
                node_type: ModelNodeIdentifierNodeTypeEnum.Image,
              };
            }),
          ],
          window: {
            offset: 0,
            size: 1,
          },
        },
      },
    ],
  });
  if (ApiError.isApiError(top5NodeScans)) {
    throw new Error('error getting top 5 container image scans');
  }

  return [...top5Hosts, ...top5Containers, ...top5Images]
    .map((node) => {
      const latestScan = top5NodeScans.scans_info?.find(
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
  const uniqueVulenrabilityCounts = await makeRequest({
    apiFunction: getSearchApiClient().searchMalwaresCount,
    apiArgs: [
      {
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
      },
    ],
  });

  if (ApiError.isApiError(uniqueVulenrabilityCounts)) {
    // TODO handle error
    throw new Error('Error getting secrets counts');
  }

  return {
    total: uniqueVulenrabilityCounts.count,
    severityBreakdown: {
      critical: uniqueVulenrabilityCounts.categories?.['critical'] ?? 0,
      high: uniqueVulenrabilityCounts.categories?.['high'] ?? 0,
      medium: uniqueVulenrabilityCounts.categories?.['medium'] ?? 0,
      low: uniqueVulenrabilityCounts.categories?.['low'] ?? 0,
      unknown: uniqueVulenrabilityCounts.categories?.['unknown'] ?? 0,
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
      <ThreatStrykerBanner />
      <NodeCounts />
      <div className="grid grid-cols-2 2xl:grid-cols-3 gap-2 auto-rows-auto px-2 last:mb-2">
        <TopAttackPaths />
        <Posture />
        <Registries />
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
