import { createQueryKeys } from '@lukemorales/query-key-factory';
import { startCase } from 'lodash-es';

import {
  getCloudComplianceApiClient,
  getCloudNodesApiClient,
  getComplianceApiClient,
  getMalwareApiClient,
  getRegistriesApiClient,
  getSecretApiClient,
  getTopologyApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import { OnboardConnectionNode } from '@/features/onboard/pages/connectors/MyConnectors';
import { apiWrapper } from '@/utils/api';
import { getRegistryDisplayId } from '@/utils/registry';

export const statusScanApiFunctionMap = {
  vulnerability: getVulnerabilityApiClient().statusVulnerabilityScan,
  secret: getSecretApiClient().statusSecretScan,
  malware: getMalwareApiClient().statusMalwareScan,
  compliance: getComplianceApiClient().statusComplianceScan,
  cloudCompliance: getCloudComplianceApiClient().statusCloudComplianceScan,
};

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
              urlId: `${registry.node_id ?? ''}`,
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
  scanStatus: (filters: {
    nodeType: string;
    bulkScanId: string;
    scanType: keyof typeof statusScanApiFunctionMap;
  }) => {
    const { nodeType, bulkScanId, scanType: _scanType } = filters;
    let scanType = _scanType;
    return {
      queryKey: ['scanStatus'],
      queryFn: async () => {
        // TODO: Backend wants compliance status api for cloud to use cloud-compliance api
        if (scanType === 'compliance' && nodeType === 'cloud_account') {
          scanType = 'cloudCompliance';
        }

        const statusScanApi = apiWrapper({
          fn: statusScanApiFunctionMap[scanType],
        });
        const statusResponse = await statusScanApi({
          modelScanStatusReq: {
            scan_ids: [],
            bulk_scan_id: bulkScanId,
          },
        });
        if (!statusResponse.ok) {
          return {
            message: statusResponse.error.message,
            data: [],
          };
        }

        if (statusResponse.value === null) {
          return {
            data: [],
          };
        }
        if (
          statusResponse.value.statuses &&
          Array.isArray(statusResponse.value.statuses)
        ) {
          return {
            data: statusResponse.value.statuses,
          };
        }

        return {
          data: Object.values(statusResponse.value.statuses ?? {}),
        };
      },
    };
  },
});
