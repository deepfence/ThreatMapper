import { Suspense } from 'react';
import { useLoaderData } from 'react-router-dom';

import { getSearchApiClient, getSecretApiClient } from '@/api/api';
import { ModelNodeIdentifierNodeTypeEnum } from '@/api/generated';
import { SEVERITY_COLORS } from '@/constants/charts';
import { SecretCountByRulenameCard } from '@/features/secrets/components/landing/SecretCountByRulenameCard';
import { TopNSecretCard } from '@/features/secrets/components/landing/TopNSecretCard';
import { TopNSecretChartData } from '@/features/secrets/components/landing/TopNSecretChart';
import { SecretSeverityType } from '@/types/common';
import { ApiError, apiWrapper, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

async function getTop5SecretAssetsData(nodeType: 'image' | 'host' | 'container') {
  const top5Nodes = await makeRequest({
    apiFunction: {
      [ModelNodeIdentifierNodeTypeEnum.Image]: getSearchApiClient().searchContainerImages,
      [ModelNodeIdentifierNodeTypeEnum.Host]: getSearchApiClient().searchHosts,
      [ModelNodeIdentifierNodeTypeEnum.Container]: getSearchApiClient().searchContainers,
    }[nodeType],
    apiArgs: [
      {
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
  if (ApiError.isApiError(top5Nodes)) {
    throw new Error('error getting top 5 container images');
  }
  const top5NodeScans = await makeRequest({
    apiFunction: getSearchApiClient().searchSecretsScan,
    apiArgs: [
      {
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
                  node_id: top5Nodes
                    .map((node) => node.secret_latest_scan_id)
                    .filter((scanId) => {
                      return !!scanId?.length;
                    }),
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
            size: 5,
          },
        },
      },
    ],
  });
  if (ApiError.isApiError(top5NodeScans)) {
    throw new Error('error getting top 5 scans');
  }

  return top5Nodes
    .map((node) => {
      const latestScan = top5NodeScans.find((scan) => scan.node_id === node.node_id);
      if (!latestScan) {
        return null;
      }
      return {
        name: latestScan.node_name,
        critical: latestScan.severity_counts?.critical ?? 0,
        high: latestScan.severity_counts?.high ?? 0,
        medium: latestScan.severity_counts?.medium ?? 0,
        low: latestScan.severity_counts?.low ?? 0,
        unknown: latestScan.severity_counts?.unknown ?? 0,
      };
    })
    .reduce<
      Array<{
        name: string;
        critical: number;
        high: number;
        medium: number;
        low: number;
        unknown: number;
      }>
    >((acc, curr) => {
      if (curr) {
        acc.push(curr);
      }
      return acc;
    }, []);
}

const getSecretCountsByRulename = async () => {
  const getSecretsCountByRulename = apiWrapper({
    fn: getSecretApiClient().getSecretsCountByRulename,
  });

  const results = await getSecretsCountByRulename();

  if (!results.ok) {
    console.error(results.error);
    throw new Error('error getting secret counts by rulename');
  }

  type SecretCountByRulenameResults = Array<{
    name: string;
    itemStyle?: {
      color: string;
    };
    children: Array<
      SecretCountByRulenameResults[number] & {
        value: number;
      }
    >;
  }>;
  const res: SecretCountByRulenameResults = [];
  results.value.groups?.forEach((group) => {
    const existingGroup = res.find((r) => r.name === group.severity);

    if (!existingGroup) {
      res.push({
        name: group.severity ?? '',
        itemStyle: {
          color: SEVERITY_COLORS[(group.severity ?? 'unknown') as SecretSeverityType],
        },
        children: [
          {
            name: group.name ?? '',
            children: [],
            value: group.count ?? 0,
            itemStyle: {
              color: SEVERITY_COLORS[(group.severity ?? 'unknown') as SecretSeverityType],
            },
          },
        ],
      });
    } else {
      existingGroup.children.push({
        name: group.name ?? '',
        children: [],
        value: group.count ?? 0,
        itemStyle: {
          color: SEVERITY_COLORS[(group.severity ?? 'unknown') as SecretSeverityType],
        },
      });
    }
  });
  return res;
};

export type SecretLandingLoaderData = {
  imageSeverityResults: Array<TopNSecretChartData>;
  hostSeverityResults: Array<TopNSecretChartData>;
  containerSeverityResults: Array<TopNSecretChartData>;
  secretCountsByRulename: Awaited<ReturnType<typeof getSecretCountsByRulename>>;
};

const loader = async (): Promise<TypedDeferredData<SecretLandingLoaderData>> => {
  return typedDefer({
    imageSeverityResults: getTop5SecretAssetsData('image'),
    hostSeverityResults: getTop5SecretAssetsData('host'),
    containerSeverityResults: getTop5SecretAssetsData('container'),
    secretCountsByRulename: getSecretCountsByRulename(),
  });
};

const Secret = () => {
  const loaderData = useLoaderData() as SecretLandingLoaderData;
  return (
    <div>
      <div className="flex p-2 items-center w-full shadow bg-white dark:bg-gray-800 h-10">
        <span className="text-md font-medium text-gray-700 dark:text-gray-200">
          Secrets
        </span>
      </div>
      <div className="p-2 grid grid-cols-12 gap-2">
        <div className="col-span-4">
          <Suspense
            fallback={
              <TopNSecretCard
                title="Top Secret Containers"
                link="/secret/scans?nodeType=container"
                data={[]}
                loading
              />
            }
          >
            <DFAwait resolve={loaderData.containerSeverityResults}>
              {(resolvedData: SecretLandingLoaderData['containerSeverityResults']) => {
                return (
                  <TopNSecretCard
                    title="Top Secret Containers"
                    link="/secret/scans?nodeType=container"
                    data={resolvedData}
                  />
                );
              }}
            </DFAwait>
          </Suspense>
        </div>
        <div className="col-span-4">
          <Suspense
            fallback={
              <TopNSecretCard
                title="Top Secret Hosts"
                link="/secret/scans?nodeType=host"
                data={[]}
                loading
              />
            }
          >
            <DFAwait resolve={loaderData.hostSeverityResults}>
              {(resolvedData: SecretLandingLoaderData['hostSeverityResults']) => {
                return (
                  <TopNSecretCard
                    title="Top Secret Hosts"
                    link="/secret/scans?nodeType=host"
                    data={resolvedData}
                  />
                );
              }}
            </DFAwait>
          </Suspense>
        </div>
        <div className="col-span-4">
          <Suspense
            fallback={
              <TopNSecretCard
                title="Top Secret Container Images"
                link="/secret/scans?nodeType=container_image"
                data={[]}
                loading
              />
            }
          >
            <DFAwait resolve={loaderData.imageSeverityResults}>
              {(resolvedData: SecretLandingLoaderData['imageSeverityResults']) => {
                return (
                  <TopNSecretCard
                    title="Top Secret Container Images"
                    link="/secret/scans?nodeType=container_image"
                    data={resolvedData}
                  />
                );
              }}
            </DFAwait>
          </Suspense>
        </div>
        <div className="col-span-12">
          <SecretCountByRulenameCard
            title="Secret counts by Rule names"
            link="/secret/scans"
          />
        </div>
      </div>
    </div>
  );
};

export const module = {
  loader,
  element: <Secret />,
};
