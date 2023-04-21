import { Suspense } from 'react';
import { useLoaderData } from 'react-router-dom';

import { getSearchApiClient, getSecretApiClient } from '@/api/api';
import {
  ModelContainer,
  ModelContainerImage,
  ModelHost,
  ModelNodeIdentifierNodeTypeEnum,
} from '@/api/generated';
import { TopNSecretCard } from '@/features/secrets/components/landing/TopNSecretCard';
import { TopNSecretChartData } from '@/features/secrets/components/landing/TopNSecretChart';
import { ApiError, makeRequest } from '@/utils/api';
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
          node_ids: top5Nodes.map((node) => {
            return {
              node_id: node.node_id,
              node_type: nodeType,
            };
          }),
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

  return top5Nodes.map((node) => {
    const latestScan = top5NodeScans.scans_info?.find(
      (scan) => scan.node_id === node.node_id,
    );
    let name = '';
    if (nodeType === 'image') {
      name = `${(node as ModelContainerImage).docker_image_name}:${
        (node as ModelContainerImage).docker_image_tag
      }`;
    } else if (nodeType === 'container') {
      name = `${(node as ModelContainer).docker_container_name} on ${
        (node as ModelContainer).host_name
      }`;
    } else if (nodeType === 'host') {
      name = (node as ModelHost).host_name;
    }
    return {
      name,
      critical: latestScan?.severity_counts?.critical ?? 0,
      high: latestScan?.severity_counts?.high ?? 0,
      medium: latestScan?.severity_counts?.medium ?? 0,
      low: latestScan?.severity_counts?.low ?? 0,
      unknown: latestScan?.severity_counts?.unknown ?? 0,
    };
  });
}

type LoaderData = {
  imageSeverityResults: Array<TopNSecretChartData>;
  hostSeverityResults: Array<TopNSecretChartData>;
  containerSeverityResults: Array<TopNSecretChartData>;
};

const loader = async (): Promise<TypedDeferredData<LoaderData>> => {
  return typedDefer({
    imageSeverityResults: getTop5SecretAssetsData('image'),
    hostSeverityResults: getTop5SecretAssetsData('host'),
    containerSeverityResults: getTop5SecretAssetsData('container'),
  });
};

const Secret = () => {
  const loaderData = useLoaderData() as LoaderData;
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
              {(resolvedData: LoaderData['containerSeverityResults']) => {
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
              {(resolvedData: LoaderData['hostSeverityResults']) => {
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
              {(resolvedData: LoaderData['imageSeverityResults']) => {
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
      </div>
    </div>
  );
};

export const module = {
  loader,
  element: <Secret />,
};
