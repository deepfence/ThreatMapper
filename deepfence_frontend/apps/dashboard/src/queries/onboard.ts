import { createQueryKeys } from '@lukemorales/query-key-factory';
import { groupBy, isEmpty, startCase } from 'lodash-es';

import {
  getCloudComplianceApiClient,
  getCloudNodesApiClient,
  getComplianceApiClient,
  getMalwareApiClient,
  getRegistriesApiClient,
  getSearchApiClient,
  getSecretApiClient,
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
import { getResponseErrors } from '@/utils/403';
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
        const gcpResultsPromise = listCloudNodeAccountApi({
          modelCloudNodeAccountsListReq: {
            cloud_provider: 'gcp',
            window: {
              offset: 0,
              size: 1000000,
            },
          },
        });
        const azureResultsPromise = listCloudNodeAccountApi({
          modelCloudNodeAccountsListReq: {
            cloud_provider: 'azure',
            window: {
              offset: 0,
              size: 1000000,
            },
          },
        });
        const awsOrgResultsPromise = listCloudNodeAccountApi({
          modelCloudNodeAccountsListReq: {
            cloud_provider: 'aws_org',
            window: {
              offset: 0,
              size: 1000000,
            },
          },
        });
        const gcpOrgResultsPromise = listCloudNodeAccountApi({
          modelCloudNodeAccountsListReq: {
            cloud_provider: 'gcp_org',
            window: {
              offset: 0,
              size: 1000000,
            },
          },
        });

        const searchHostsApi = apiWrapper({
          fn: getSearchApiClient().searchHosts,
        });
        const hostsResultsPromise = searchHostsApi({
          searchSearchNodeReq: {
            node_filter: {
              filters: {
                compare_filter: null,
                contains_filter: {
                  filter_in: { pseudo: [false], active: [true], agent_running: [true] },
                },
                match_filter: { filter_in: {} },
                order_filter: { order_fields: [] },
              },
              in_field_filter: null,
              window: { offset: 0, size: 0 },
            },
            window: {
              offset: 0,
              size: Number.MAX_SAFE_INTEGER,
            },
          },
        });

        const searchKubernetesClustersApi = apiWrapper({
          fn: getSearchApiClient().searchKubernetesClusters,
        });
        const kubernetesResultsPromise = searchKubernetesClustersApi({
          searchSearchNodeReq: {
            node_filter: {
              filters: {
                compare_filter: null,
                contains_filter: { filter_in: { active: [true] } },
                match_filter: { filter_in: {} },
                order_filter: { order_fields: null },
              },
              in_field_filter: null,
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

        const listRegistriesApi = apiWrapper({
          fn: getRegistriesApiClient().listRegistries,
        });
        const registriesResultsPromise = listRegistriesApi();

        const [
          awsResults,
          hostsResults,
          kubernetesResults,
          registriesResults,
          gcpResults,
          azureResults,
          awsOrgResults,
          gcpOrgResults,
        ] = await Promise.all([
          awsResultsPromise,
          hostsResultsPromise,
          kubernetesResultsPromise,
          registriesResultsPromise,
          gcpResultsPromise,
          azureResultsPromise,
          awsOrgResultsPromise,
          gcpOrgResultsPromise,
        ]);

        if (
          !awsResults.ok ||
          !hostsResults.ok ||
          !kubernetesResults.ok ||
          !registriesResults.ok ||
          !gcpResults.ok ||
          !azureResults.ok ||
          !awsOrgResults.ok ||
          !gcpOrgResults.ok
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
                connectionMethod: 'Cloud connector',
                accountId: result.node_name ?? '-',
                active: !!result.active,
              })) ?? []
            ).sort((a, b) => {
              return (a.accountId ?? '').localeCompare(b.accountId ?? '');
            }),
          });
        }
        if (awsOrgResults.value.total) {
          data.push({
            id: 'aws_org',
            urlId: 'aws_org',
            urlType: 'aws_org',
            accountType: 'AWS Organizations',
            count: awsOrgResults.value.total,
            connections: (
              awsOrgResults.value.cloud_node_accounts_info?.map((result) => ({
                id: `aws_org-${result.node_id}`,
                urlId: result.node_id ?? '',
                accountType: 'AWS Organizations',
                urlType: 'aws_org',
                connectionMethod: 'Cloud connector',
                accountId: result.node_name ?? '-',
                active: !!result.active,
              })) ?? []
            ).sort((a, b) => {
              return (a.accountId ?? '').localeCompare(b.accountId ?? '');
            }),
          });
        }

        if (gcpResults.value.total) {
          data.push({
            id: 'gcp',
            urlId: 'gcp',
            urlType: 'gcp',
            accountType: 'GCP',
            count: gcpResults.value.total,
            connections: (
              gcpResults.value.cloud_node_accounts_info?.map((result) => ({
                id: `gcp-${result.node_id}`,
                urlId: result.node_id ?? '',
                accountType: 'GCP',
                urlType: 'gcp',
                connectionMethod: 'Cloud connector',
                accountId: result.node_name ?? '-',
                active: !!result.active,
              })) ?? []
            ).sort((a, b) => {
              return (a.accountId ?? '').localeCompare(b.accountId ?? '');
            }),
          });
        }
        if (gcpOrgResults.value.total) {
          data.push({
            id: 'gcp_org',
            urlId: 'gcp_org',
            urlType: 'gcp_org',
            accountType: 'GCP Organizations',
            count: gcpOrgResults.value.total,
            connections: (
              gcpOrgResults.value.cloud_node_accounts_info?.map((result) => ({
                id: `gcp_org-${result.node_id}`,
                urlId: result.node_id ?? '',
                accountType: 'GCP Organizations',
                urlType: 'gcp_org',
                connectionMethod: 'Cloud connector',
                accountId: result.node_name ?? '-',
                active: !!result.active,
              })) ?? []
            ).sort((a, b) => {
              return (a.accountId ?? '').localeCompare(b.accountId ?? '');
            }),
          });
        }

        if (azureResults.value.total) {
          data.push({
            id: 'azure',
            urlId: 'azure',
            urlType: 'azure',
            accountType: 'Azure',
            count: azureResults.value.total,
            connections: (
              azureResults.value.cloud_node_accounts_info?.map((result) => ({
                id: `gcp-${result.node_id}`,
                urlId: result.node_id ?? '',
                accountType: 'Azure',
                urlType: 'azure',
                connectionMethod: 'Cloud connector',
                accountId: result.node_name ?? '-',
                active: !!result.active,
              })) ?? []
            ).sort((a, b) => {
              return (a.accountId ?? '').localeCompare(b.accountId ?? '');
            }),
          });
        }

        if (hostsResults.value.length) {
          data.push({
            id: 'hosts',
            urlId: 'hosts',
            urlType: 'host',
            accountType: 'Linux Hosts',
            count: hostsResults.value.length,
            connections: hostsResults.value.map((host) => ({
              id: `hosts-${host.node_id}`,
              urlId: host.node_id ?? '',
              urlType: 'host',
              accountType: 'Host',
              connectionMethod: 'Agent',
              accountId: host.node_name ?? host.node_id ?? '-',
              active: true,
            })),
          });
        }
        if (kubernetesResults.value.length) {
          data.push({
            id: 'kubernetesCluster',
            urlId: 'kubernetes_cluster',
            urlType: 'kubernetes_cluster',
            accountType: 'Kubernetes Clusters',
            count: kubernetesResults.value.length,
            connections: kubernetesResults.value.map((cluster) => ({
              id: `kubernetesCluster-${cluster.node_id}`,
              urlId: cluster.node_id ?? '',
              urlType: 'kubernetes_cluster',
              accountType: 'Kubernetes Clusters',
              connectionMethod: 'Agent',
              accountId: cluster.node_name ?? cluster.node_id ?? '-',
              active: true,
            })),
          });
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
    const { bulkScanId, scanType } = filters;
    return {
      queryKey: ['scanStatus'],
      queryFn: async () => {
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
          const { message } = await getResponseErrors(statusResponse.error);
          return {
            message,
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
