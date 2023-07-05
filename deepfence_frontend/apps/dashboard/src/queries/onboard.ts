import { createQueryKeys } from '@lukemorales/query-key-factory';
import { startCase } from 'lodash-es';

import {
  getCloudNodesApiClient,
  getRegistriesApiClient,
  getTopologyApiClient,
} from '@/api/api';
import { OnboardConnectionNode } from '@/features/onboard/pages/connectors/MyConnectors';
import { apiWrapper } from '@/utils/api';
import { getRegistryDisplayId } from '@/utils/registry';

export const onboardQueries = createQueryKeys('onboard', {
  listConnectors: () => {
    return {
      queryKey: ['listConnectors'],
      queryFn: async () => {
        const listCloudNodeAccountApi = apiWrapper({
          fn: getCloudNodesApiClient().listCloudNodeAccount,
        });
        const awsResultsPromise = listCloudNodeAccountApi({
          modelCloudNodeAccountsListReq: {
            cloud_provider: 'aws',
            window: {
              offset: 0,
              size: 1000000,
            },
          },
        });

        const getHostsTopologyGraphApi = apiWrapper({
          fn: getTopologyApiClient().getHostsTopologyGraph,
        });
        const hostsResultsPromise = getHostsTopologyGraphApi({
          graphTopologyFilters: {
            skip_connections: true,
            cloud_filter: [],
            field_filters: {
              contains_filter: { filter_in: null },
              order_filter: { order_fields: [] },
              match_filter: {
                filter_in: {},
              },
              compare_filter: null,
            },
            host_filter: [],
            kubernetes_filter: [],
            pod_filter: [],
            region_filter: [],
            container_filter: [],
          },
        });

        const getKubernetesTopologyGraphApi = apiWrapper({
          fn: getTopologyApiClient().getKubernetesTopologyGraph,
        });
        const kubernetesResultsPromise = getKubernetesTopologyGraphApi({
          graphTopologyFilters: {
            skip_connections: true,
            cloud_filter: [],
            field_filters: {
              contains_filter: { filter_in: null },
              order_filter: { order_fields: [] },
              match_filter: {
                filter_in: {},
              },
              compare_filter: null,
            },
            host_filter: [],
            kubernetes_filter: [],
            pod_filter: [],
            region_filter: [],
            container_filter: [],
          },
        });

        const listRegistriesApi = apiWrapper({
          fn: getRegistriesApiClient().listRegistries,
        });
        const registriesResultsPromise = listRegistriesApi();

        const [awsResults, hostsResults, kubernetesResults, registriesResults] =
          await Promise.all([
            awsResultsPromise,
            hostsResultsPromise,
            kubernetesResultsPromise,
            registriesResultsPromise,
          ]);

        if (
          !awsResults.ok ||
          !hostsResults.ok ||
          !kubernetesResults.ok ||
          !registriesResults.ok
        ) {
          // TODO(manan) handle error cases
          return [];
        }

        const data: Array<OnboardConnectionNode> = [];
        if (awsResults.value.total) {
          data.push({
            id: 'aws',
            urlId: 'aws',
            urlType: 'aws',
            accountType: 'AWS',
            count: awsResults.value.total,
            connections: (
              awsResults.value.cloud_node_accounts_info?.map((result) => ({
                id: `aws-${result.node_id}`,
                urlId: result.node_id ?? '',
                accountType: 'AWS',
                urlType: 'aws',
                connectionMethod: 'Terraform',
                accountId: result.node_name ?? '-',
                active: !!result.active,
              })) ?? []
            ).sort((a, b) => {
              return (a.accountId ?? '').localeCompare(b.accountId ?? '');
            }),
          });
        }

        if (hostsResults.value.nodes) {
          const hosts = Object.keys(hostsResults.value.nodes)
            .map((key) => hostsResults.value.nodes[key])
            .filter((node) => {
              return node.type === 'host';
            })
            .sort((a, b) => {
              return (a.label ?? a.id ?? '').localeCompare(b.label ?? b.id ?? '');
            });
          if (hosts.length) {
            data.push({
              id: 'hosts',
              urlId: 'hosts',
              urlType: 'host',
              accountType: 'Linux Hosts',
              count: hosts.length,
              connections: hosts.map((host) => ({
                id: `hosts-${host.id}`,
                urlId: host.id ?? '',
                urlType: 'host',
                accountType: 'Host',
                connectionMethod: 'Agent',
                accountId: host.label ?? host.id ?? '-',
                active: true,
              })),
            });
          }
        }
        if (kubernetesResults.value.nodes) {
          const clusters = Object.keys(kubernetesResults.value.nodes)
            .map((key) => kubernetesResults.value.nodes[key])
            .filter((node) => {
              return node.type === 'kubernetes_cluster';
            })
            .sort((a, b) => {
              return (a.label ?? a.id ?? '').localeCompare(b.label ?? b.id ?? '');
            });
          if (clusters.length) {
            data.push({
              id: 'kubernetesCluster',
              urlId: 'kubernetes_cluster',
              urlType: 'kubernetes_cluster',
              accountType: 'Kubernetes Clusters',
              count: clusters.length,
              connections: clusters.map((cluster) => ({
                id: `kubernetesCluster-${cluster.id}`,
                urlId: cluster.id ?? '',
                urlType: 'kubernetes_cluster',
                accountType: 'Kubernetes Clusters',
                connectionMethod: 'Agent',
                accountId: cluster.label ?? cluster.id ?? '-',
                active: true,
              })),
            });
          }
        }

        if (registriesResults.value.length) {
          data.push({
            id: 'registry',
            urlId: 'registry',
            urlType: 'registry',
            accountType: 'Container Registries',
            count: registriesResults.value.length,
            connections: registriesResults.value.map((registry) => ({
              id: `registry-${registry.id}`,
              urlId: `${registry.id ?? ''}`,
              urlType: 'registry',
              accountType: startCase(registry.registry_type ?? 'Registry'),
              connectionMethod: 'Registry',
              accountId: getRegistryDisplayId(registry),
              active: true,
            })),
          });
        }

        return data;
      },
    };
  },
});
