import { createQueryKeys } from '@lukemorales/query-key-factory';
import { groupBy, isEmpty, startCase } from 'lodash-es';

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
import {
  ModelCloudComplianceScanResult,
  ModelComplianceScanInfo,
  ModelComplianceScanResult,
  ModelMalwareScanResult,
  ModelScanInfo,
  ModelSecretScanResult,
  ModelVulnerabilityScanResult,
  ResponseError,
} from '@/api/generated';
import { OnboardConnectionNode } from '@/features/onboard/pages/connectors/MyConnectors';
import { getAccountName } from '@/features/onboard/utils/summary';
import {
  MalwareSeverityType,
  PostureSeverityType,
  ScanTypeEnum,
  SecretSeverityType,
  VulnerabilitySeverityType,
} from '@/types/common';
import { apiWrapper } from '@/utils/api';
import { getRegistryDisplayId } from '@/utils/registry';

export const statusScanApiFunctionMap = {
  [ScanTypeEnum.VulnerabilityScan]: getVulnerabilityApiClient().statusVulnerabilityScan,
  [ScanTypeEnum.SecretScan]: getSecretApiClient().statusSecretScan,
  [ScanTypeEnum.MalwareScan]: getMalwareApiClient().statusMalwareScan,
  [ScanTypeEnum.ComplianceScan]: getComplianceApiClient().statusComplianceScan,
  [ScanTypeEnum.CloudComplianceScan]:
    getCloudComplianceApiClient().statusCloudComplianceScan,
};

const getComplianceSummary = (
  data: ModelCloudComplianceScanResult | ModelComplianceScanResult,
) => {
  return {
    benchmarkType: data.benchmark_type?.join(', ') ?? 'unknown',
    accountName: data.node_name,
    accountType: data.node_type,
    compliancePercentage: data.compliance_percentage,
    total: Object.keys(data.status_counts ?? {}).reduce((acc, severity) => {
      acc = acc + (data.status_counts?.[severity] ?? 0);
      return acc;
    }, 0),
    ...((data.status_counts ?? {}) as Record<PostureSeverityType, number>),
  };
};

async function getScanStatus(
  bulkScanId: string,
  scanType: ScanTypeEnum,
): Promise<Array<ModelScanInfo | ModelComplianceScanInfo>> {
  const statusScanApi = apiWrapper({
    fn: statusScanApiFunctionMap[scanType],
  });
  const statusScanResponse = await statusScanApi({
    modelScanStatusReq: {
      scan_ids: [],
      bulk_scan_id: bulkScanId,
    },
  });
  if (!statusScanResponse.ok) {
    throw statusScanResponse.error;
  }

  if (
    statusScanResponse.value.statuses &&
    Array.isArray(statusScanResponse.value.statuses)
  ) {
    return statusScanResponse.value.statuses;
  }

  return Object.values(statusScanResponse.value.statuses ?? {});
}

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
    bulkScanId: string;
    scanType: keyof typeof statusScanApiFunctionMap;
  }) => {
    const { bulkScanId, scanType: _scanType } = filters;
    let scanType = _scanType;
    return {
      queryKey: ['scanStatus'],
      queryFn: async () => {
        // TODO: Backend wants compliance status api for cloud to use cloud-compliance api
        if (scanType === ScanTypeEnum.CloudComplianceScan) {
          scanType = ScanTypeEnum.CloudComplianceScan;
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
  vulnerabilityScanSummary: (filters: {
    bulkScanId: string;
    scanType: keyof typeof statusScanApiFunctionMap;
  }) => {
    const { bulkScanId, scanType } = filters;
    return {
      queryKey: [filters],
      queryFn: async () => {
        const statuses = await getScanStatus(bulkScanId, scanType);
        const scanIds =
          statuses
            ?.filter((status) => status?.status === 'COMPLETE')
            .map((status) => status.scan_id) ?? [];

        const bulkRequest = scanIds.map((scanId) => {
          const resultVulnerabilityScanApi = apiWrapper({
            fn: getVulnerabilityApiClient().resultVulnerabilityScan,
          });
          return resultVulnerabilityScanApi({
            modelScanResultsReq: {
              fields_filter: {
                contains_filter: {
                  filter_in: {},
                },
                order_filter: {
                  order_fields: [],
                },
                match_filter: {
                  filter_in: {},
                },
                compare_filter: null,
              },
              scan_id: scanId,
              window: {
                offset: 0,
                size: 1000000,
              },
            },
          });
        });
        const responses = await Promise.all(bulkRequest);

        const initial: {
          err: ResponseError[];
          accNonEmpty: ModelVulnerabilityScanResult[];
          accEmpty: ModelVulnerabilityScanResult[];
        } = {
          err: [],
          accNonEmpty: [],
          accEmpty: [],
        };
        responses.forEach((response) => {
          if (!response.ok) {
            return initial.err.push(response.error);
          } else {
            if (isEmpty(response.value.severity_counts)) {
              initial.accEmpty.push(response.value);
            } else {
              initial.accNonEmpty.push(response.value);
            }
          }
        });
        const resultData = initial.accNonEmpty.map((response) => {
          return {
            accountName: getAccountName(response),
            accountType: response.node_type,
            total: Object.keys(response.severity_counts ?? {}).reduce((acc, severity) => {
              acc = acc + (response.severity_counts?.[severity] ?? 0);
              return acc;
            }, 0),
            ...(response.severity_counts as Record<VulnerabilitySeverityType, number>),
          };
        });
        const resultWithEmptySeverityAtEnd = resultData.concat(
          initial.accEmpty.map((response) => {
            return {
              accountName: getAccountName(response),
              accountType: response.node_type,
              total: Object.keys(response.severity_counts ?? {}).reduce(
                (acc, severity) => {
                  acc = acc + (response.severity_counts?.[severity] ?? 0);
                  return acc;
                },
                0,
              ),
              ...(response.severity_counts as Record<VulnerabilitySeverityType, number>),
            };
          }),
        );
        return resultWithEmptySeverityAtEnd;
      },
    };
  },
  secretScanSummary: (filters: {
    bulkScanId: string;
    scanType: keyof typeof statusScanApiFunctionMap;
  }) => {
    const { bulkScanId, scanType } = filters;
    return {
      queryKey: [filters],
      queryFn: async () => {
        const statuses = await getScanStatus(bulkScanId, scanType);
        const scanIds =
          statuses
            ?.filter((status) => status?.status === 'COMPLETE')
            .map((status) => status.scan_id) ?? [];

        const bulkRequest = scanIds.map((scanId) => {
          const resultSecretScanApi = apiWrapper({
            fn: getSecretApiClient().resultSecretScan,
          });
          return resultSecretScanApi({
            modelScanResultsReq: {
              fields_filter: {
                contains_filter: {
                  filter_in: {},
                },
                order_filter: {
                  order_fields: [],
                },
                match_filter: {
                  filter_in: {},
                },
                compare_filter: null,
              },
              scan_id: scanId,
              window: {
                offset: 0,
                size: 1000000,
              },
            },
          });
        });
        const responses = await Promise.all(bulkRequest);

        const initial: {
          err: ResponseError[];
          accNonEmpty: ModelSecretScanResult[];
          accEmpty: ModelSecretScanResult[];
        } = {
          err: [],
          accNonEmpty: [],
          accEmpty: [],
        };
        responses.forEach((response) => {
          if (!response.ok) {
            return initial.err.push(response.error);
          } else {
            if (isEmpty(response.value.severity_counts)) {
              initial.accEmpty.push(response.value);
            } else {
              initial.accNonEmpty.push(response.value);
            }
          }
        });
        const resultData = initial.accNonEmpty.map((response) => {
          return {
            accountName: getAccountName(response),
            accountType: response.node_type,
            total: Object.keys(response.severity_counts ?? {}).reduce((acc, severity) => {
              acc = acc + (response.severity_counts?.[severity] ?? 0);
              return acc;
            }, 0),
            ...(response.severity_counts as Record<SecretSeverityType, number>),
          };
        });
        const resultWithEmptySeverityAtEnd = resultData.concat(
          initial.accEmpty.map((response) => {
            return {
              accountName: getAccountName(response),
              accountType: response.node_type,
              total: Object.keys(response.severity_counts ?? {}).reduce(
                (acc, severity) => {
                  acc = acc + (response.severity_counts?.[severity] ?? 0);
                  return acc;
                },
                0,
              ),
              ...(response.severity_counts as Record<SecretSeverityType, number>),
            };
          }),
        );
        return resultWithEmptySeverityAtEnd;
      },
    };
  },
  malwareScanSummary: (filters: { bulkScanId: string; scanType: ScanTypeEnum }) => {
    const { bulkScanId, scanType } = filters;
    return {
      queryKey: [filters],
      queryFn: async () => {
        const statuses = await getScanStatus(bulkScanId, scanType);
        const scanIds =
          statuses
            ?.filter((status) => status?.status === 'COMPLETE')
            .map((status) => status.scan_id) ?? [];

        const bulkRequest = scanIds.map((scanId) => {
          const resultMalwareScanApi = apiWrapper({
            fn: getMalwareApiClient().resultMalwareScan,
          });
          return resultMalwareScanApi({
            modelScanResultsReq: {
              fields_filter: {
                contains_filter: {
                  filter_in: {},
                },
                order_filter: {
                  order_fields: [],
                },
                match_filter: {
                  filter_in: {},
                },
                compare_filter: null,
              },
              scan_id: scanId,
              window: {
                offset: 0,
                size: 1000000,
              },
            },
          });
        });
        const responses = await Promise.all(bulkRequest);

        const initial: {
          err: ResponseError[];
          accNonEmpty: ModelMalwareScanResult[];
          accEmpty: ModelMalwareScanResult[];
        } = {
          err: [],
          accNonEmpty: [],
          accEmpty: [],
        };
        responses.forEach((response) => {
          if (!response.ok) {
            return initial.err.push(response.error);
          } else {
            if (isEmpty(response.value.severity_counts)) {
              initial.accEmpty.push(response.value);
            } else {
              initial.accNonEmpty.push(response.value);
            }
          }
        });
        const resultData = initial.accNonEmpty.map((response) => {
          return {
            accountName: getAccountName(response),
            accountType: response.node_type,
            total: Object.keys(response.severity_counts ?? {}).reduce((acc, severity) => {
              acc = acc + (response.severity_counts?.[severity] ?? 0);
              return acc;
            }, 0),
            ...(response.severity_counts as Record<MalwareSeverityType, number>),
          };
        });
        const resultWithEmptySeverityAtEnd = resultData.concat(
          initial.accEmpty.map((response) => {
            return {
              accountName: getAccountName(response),
              accountType: response.node_type,
              total: Object.keys(response.severity_counts ?? {}).reduce(
                (acc, severity) => {
                  acc = acc + (response.severity_counts?.[severity] ?? 0);
                  return acc;
                },
                0,
              ),
              ...(response.severity_counts as Record<MalwareSeverityType, number>),
            };
          }),
        );
        return resultWithEmptySeverityAtEnd;
      },
    };
  },
  complianceScanSummary: (filters: { bulkScanId: string }) => {
    const { bulkScanId } = filters;
    return {
      queryKey: [filters],
      queryFn: async () => {
        const statuses = await getScanStatus(bulkScanId, ScanTypeEnum.ComplianceScan);
        const scanIds =
          statuses
            ?.filter((status) => status?.status === 'COMPLETE')
            .map((status) => status.scan_id) ?? [];

        const bulkRequest = scanIds.map((scanId) => {
          const resultComplianceScanApi = apiWrapper({
            fn: getComplianceApiClient().resultComplianceScan,
          });
          return resultComplianceScanApi({
            modelScanResultsReq: {
              fields_filter: {
                contains_filter: {
                  filter_in: {},
                },
                order_filter: {
                  order_fields: [],
                },
                match_filter: {
                  filter_in: {},
                },
                compare_filter: null,
              },
              scan_id: scanId,
              window: {
                offset: 0,
                size: 1000000,
              },
            },
          });
        });
        const responses = await Promise.all(bulkRequest);
        const initial: {
          err: ResponseError[];
          accNonEmpty: ModelComplianceScanResult[];
          accEmpty: ModelComplianceScanResult[];
        } = {
          err: [],
          accNonEmpty: [],
          accEmpty: [],
        };

        responses.forEach((response) => {
          if (!response.ok) {
            return initial.err.push(response.error);
          } else {
            if (
              isEmpty(
                response.value.status_counts || response.value.status_counts === null,
              )
            ) {
              initial.accEmpty.push(response.value);
            } else {
              initial.accNonEmpty.push(response.value);
            }
          }
        });

        let groupedNonEmptySeverityData = groupBy(initial.accNonEmpty, 'node_id');
        if (groupedNonEmptySeverityData.length) {
          groupedNonEmptySeverityData = {};
        }
        const resultNonEmptySeverityData = initial.accNonEmpty.reduce<
          ReturnType<typeof getComplianceSummary>[]
        >((acc, current) => {
          acc.push(getComplianceSummary(current));
          return acc;
        }, []);

        const resulEmptySeverityData = initial.accEmpty.reduce<
          ReturnType<typeof getComplianceSummary>[]
        >((acc, current) => {
          acc.push(getComplianceSummary(current));
          return acc;
        }, []);

        const resultWithEmptySeverityAtEnd =
          resultNonEmptySeverityData.concat(resulEmptySeverityData);

        return resultWithEmptySeverityAtEnd;
      },
    };
  },
  cloudComplianceScanSummary: (filters: { bulkScanId: string }) => {
    const { bulkScanId } = filters;
    return {
      queryKey: [filters],
      queryFn: async () => {
        const statuses = await getScanStatus(
          bulkScanId,
          ScanTypeEnum.CloudComplianceScan,
        );
        const scanIds =
          statuses
            ?.filter((status) => status?.status === 'COMPLETE')
            .map((status) => status.scan_id) ?? [];

        const bulkRequest = scanIds.map((scanId) => {
          const resultCloudComplianceScanApi = apiWrapper({
            fn: getCloudComplianceApiClient().resultCloudComplianceScan,
          });
          return resultCloudComplianceScanApi({
            modelScanResultsReq: {
              fields_filter: {
                contains_filter: {
                  filter_in: {},
                },
                order_filter: {
                  order_fields: [],
                },
                match_filter: {
                  filter_in: {},
                },
                compare_filter: null,
              },
              scan_id: scanId,
              window: {
                offset: 0,
                size: 1000000,
              },
            },
          });
        });
        const responses = await Promise.all(bulkRequest);
        const initial: {
          err: ResponseError[];
          accNonEmpty: ModelCloudComplianceScanResult[];
          accEmpty: ModelCloudComplianceScanResult[];
        } = {
          err: [],
          accNonEmpty: [],
          accEmpty: [],
        };
        responses.forEach((response) => {
          if (!response.ok) {
            return initial.err.push(response.error);
          } else {
            if (isEmpty(response.value.status_counts)) {
              initial.accEmpty.push(response.value);
            } else {
              initial.accNonEmpty.push(response.value);
            }
          }
        });

        const resultNonEmptySeverityData = initial.accNonEmpty.reduce<
          ReturnType<typeof getComplianceSummary>[]
        >((acc, current) => {
          acc.push(getComplianceSummary(current));
          return acc;
        }, []);

        const resulEmptySeverityData = initial.accEmpty.reduce<
          ReturnType<typeof getComplianceSummary>[]
        >((acc, current) => {
          acc.push(getComplianceSummary(current));
          return acc;
        }, []);

        const resultWithEmptySeverityAtEnd =
          resultNonEmptySeverityData.concat(resulEmptySeverityData);

        return resultWithEmptySeverityAtEnd;
      },
    };
  },
});
