import cx from 'classnames';
import { groupBy, isEmpty } from 'lodash-es';
import { Suspense } from 'react';
import { IconContext } from 'react-icons/lib';
import { Await, Link, LoaderFunctionArgs, useLoaderData } from 'react-router-dom';
import { Card, CircleSpinner, Separator, Typography } from 'ui-components';

import { getCloudComplianceApiClient, getComplianceApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelCloudComplianceScanResult,
  ModelComplianceScanInfo,
  ModelComplianceScanResult,
  ModelScanInfo,
} from '@/api/generated';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { IconMapForNodeType } from '@/features/onboard/components/IconMapForNodeType';
import { statusScanApiFunctionMap } from '@/features/onboard/pages/ScanInProgress';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';

const color: { [key: string]: string } = {
  alarm: 'bg-red-400 dark:bg-red-500',
  info: 'bg-blue-400 dark:bg-blue-500',
  ok: 'bg-green-400 dark:bg-green-500',
  skip: 'bg-gray-400 dark:bg-gray-500',
};

type SeverityType = {
  name: string;
  value: number;
};

type ScanData = {
  accountName: string;
  accountType: string;
  benchmarkResults: Array<{
    benchmarkType: string;
    compliancePercentage: number;
    data: {
      total: number;
      counts: SeverityType[] | null;
    };
  }>;
} | null;

export type LoaderDataType = {
  error?: string;
  message?: string;
  data?: ScanData[];
};

const getCloudComplianceScanSummary = async (scanIds: string[]): Promise<ScanData[]> => {
  const bulkRequest = scanIds.map((scanId) => {
    return makeRequest({
      apiFunction: getCloudComplianceApiClient().resultCloudComplianceScan,
      apiArgs: [
        {
          modelScanResultsReq: {
            fields_filter: {
              contains_filter: {
                filter_in: {},
              },
              order_filter: {
                order_field: '',
              },
              match_filter: {
                filter_in: {},
              },
            },
            scan_id: scanId,
            window: {
              offset: 0,
              size: 1000000,
            },
          },
        },
      ],
    });
  });
  const responses = await Promise.all(bulkRequest);
  const initial: {
    err: ApiError<void>[];
    accNonEmpty: ModelCloudComplianceScanResult[];
    accEmpty: ModelCloudComplianceScanResult[];
  } = {
    err: [],
    accNonEmpty: [],
    accEmpty: [],
  };
  responses.forEach((response) => {
    if (ApiError.isApiError(response)) {
      // TODO: handle any one request has an error on this bulk request
      return initial.err.push(response);
    } else {
      if (isEmpty(response.status_counts)) {
        initial.accEmpty.push(response);
      } else {
        initial.accNonEmpty.push(response);
      }
    }
  });

  const groupedNonEmptySeverityData = groupBy(initial.accNonEmpty, 'node_id');
  const resultNonEmptySeverityData = Object.keys(groupedNonEmptySeverityData).map(
    (key) => {
      const data = groupedNonEmptySeverityData[key];
      return {
        accountName: data[0].node_name,
        accountType: data[0].node_type,
        benchmarkResults: data.map((item) => {
          return {
            benchmarkType: item.benchmark_type?.length ? item.benchmark_type : 'unknown',
            compliancePercentage: item.compliance_percentage,
            data: {
              total: Object.keys(item.status_counts ?? {}).reduce((acc, severity) => {
                acc = acc + (item.status_counts?.[severity] ?? 0);
                return acc;
              }, 0),
              counts: Object.keys(item.status_counts ?? {}).map((severity) => {
                return {
                  name: severity,
                  value: item.status_counts?.[severity] ?? 0,
                };
              }),
            },
          };
        }),
      };
    },
  );
  const groupedEmptySeverityData = groupBy(initial.accEmpty, 'node_id');
  const resulEmptySeverityData = Object.keys(groupedEmptySeverityData).map((key) => {
    const data = groupedEmptySeverityData[key];
    return {
      accountName: data[0].node_name,
      accountType: data[0].node_type,
      benchmarkResults: data.map((item) => {
        return {
          benchmarkType: item.benchmark_type?.length ? item.benchmark_type : 'unknown',
          compliancePercentage: item.compliance_percentage,
          data: {
            total: Object.keys(item.status_counts ?? {}).reduce((acc, severity) => {
              acc = acc + (item.status_counts?.[severity] ?? 0);
              return acc;
            }, 0),
            counts: Object.keys(item.status_counts ?? {}).map((severity) => {
              return {
                name: severity,
                value: item.status_counts?.[severity] ?? 0,
              };
            }),
          },
        };
      }),
    };
  });
  const resultWithEmptySeverityAtEnd =
    resultNonEmptySeverityData.concat(resulEmptySeverityData);
  return resultWithEmptySeverityAtEnd;
};

const getComplianceScanSummary = async (scanIds: string[]): Promise<ScanData[]> => {
  const bulkRequest = scanIds.map((scanId) => {
    return makeRequest({
      apiFunction: getComplianceApiClient().resultComplianceScan,
      apiArgs: [
        {
          modelScanResultsReq: {
            fields_filter: {
              contains_filter: {
                filter_in: {},
              },
              order_filter: {
                order_field: '',
              },
              match_filter: {
                filter_in: {},
              },
            },
            scan_id: scanId,
            window: {
              offset: 0,
              size: 1000000,
            },
          },
        },
      ],
    });
  });
  const responses = await Promise.all(bulkRequest);
  const initial: {
    err: ApiError<void>[];
    accNonEmpty: ModelComplianceScanResult[];
    accEmpty: ModelComplianceScanResult[];
  } = {
    err: [],
    accNonEmpty: [],
    accEmpty: [],
  };
  responses.forEach((response) => {
    if (ApiError.isApiError(response)) {
      // TODO: handle any one request has an error on this bulk request
      return initial.err.push(response);
    } else {
      if (isEmpty(response.status_counts)) {
        initial.accEmpty.push(response);
      } else {
        initial.accNonEmpty.push(response);
      }
    }
  });
  const groupedNonEmptySevirityData = groupBy(initial.accNonEmpty, 'node_id');
  const resultNonEmptySeverityData = Object.keys(groupedNonEmptySevirityData).map(
    (key) => {
      const data = groupedNonEmptySevirityData[key];
      return {
        accountName: data[0].node_name,
        accountType: data[0].node_type,
        benchmarkResults: data.map((item) => {
          return {
            benchmarkType: item.benchmark_type?.length ? item.benchmark_type : 'unknown',
            compliancePercentage: item.compliance_percentage,
            data: {
              total: Object.keys(item.status_counts ?? {}).reduce((acc, severity) => {
                acc = acc + (item.status_counts?.[severity] ?? 0);
                return acc;
              }, 0),
              counts: Object.keys(item.status_counts ?? {}).map((severity) => {
                return {
                  name: severity,
                  value: item.status_counts?.[severity] ?? 0,
                };
              }),
            },
          };
        }),
      };
    },
  );
  const groupedEmptySevirityData = groupBy(initial.accEmpty, 'node_id');
  const resulEmptySeverityData = Object.keys(groupedEmptySevirityData).map((key) => {
    const data = groupedNonEmptySevirityData[key];
    return {
      accountName: data[0].node_name,
      accountType: data[0].node_type,
      benchmarkResults: data.map((item) => {
        return {
          benchmarkType: item.benchmark_type?.length ? item.benchmark_type : 'unknown',
          compliancePercentage: item.compliance_percentage,
          data: {
            total: Object.keys(item.status_counts ?? {}).reduce((acc, severity) => {
              acc = acc + (item.status_counts?.[severity] ?? 0);
              return acc;
            }, 0),
            counts: Object.keys(item.status_counts ?? {}).map((severity) => {
              return {
                name: severity,
                value: item.status_counts?.[severity] ?? 0,
              };
            }),
          },
        };
      }),
    };
  });
  const resultWithEmptySeverityAtEnd =
    resultNonEmptySeverityData.concat(resulEmptySeverityData);
  return resultWithEmptySeverityAtEnd;
};

async function getScanStatus(
  bulkScanId: string,
  nodeType: string,
): Promise<Array<ModelScanInfo | ModelComplianceScanInfo>> {
  let scanType = 'compliance' as keyof typeof statusScanApiFunctionMap;
  // TODO: Backend wants compliance status api for cloud to use cloud-compliance api
  if (nodeType === 'cloud_account') {
    scanType = 'cloudCompliance';
  }
  const result = await makeRequest({
    apiFunction: statusScanApiFunctionMap[scanType],
    apiArgs: [
      {
        modelScanStatusReq: {
          bulk_scan_id: bulkScanId,
          scan_ids: [],
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<LoaderDataType>({});
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
    return [];
  }
  if (result.statuses && Array.isArray(result.statuses)) {
    return result.statuses;
  }

  return Object.values(result.statuses ?? {});
}

const loader = async ({
  params,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  const { nodeType, bulkScanId } = params;

  if (!bulkScanId?.length || !nodeType?.length) {
    throw new Error('Invalid params');
  }

  const statuses = await getScanStatus(bulkScanId, nodeType);
  const scanIds =
    statuses
      ?.filter((status) => status?.status === 'COMPLETE')
      .map((status) => status.scan_id) ?? [];

  return typedDefer({
    data:
      nodeType === 'cloud_account'
        ? getCloudComplianceScanSummary(scanIds)
        : getComplianceScanSummary(scanIds),
  });
};

const Account = ({ scanData }: { scanData: ScanData }) => {
  return (
    <div
      className={cx(
        'h-full flex flex-col items-center justify-center gap-y-3',
        'border-r dark:border-gray-700',
        'bg-gray-100 dark:bg-gray-700 p-2',
      )}
    >
      <IconContext.Provider
        value={{
          className: 'w-8 h-8 text-blue-600 dark:text-blue-500',
        }}
      >
        {scanData?.accountType ? IconMapForNodeType[scanData?.accountType] : null}
      </IconContext.Provider>
      <data
        className={`${Typography.size.base} ${Typography.weight.normal} text-gray-700 dark:text-gray-300 overflow-hidden text-ellipsis w-full text-center`}
      >
        {scanData?.accountName}
      </data>
    </div>
  );
};

const BenchmarkTypeAndPercentage = ({
  type,
  percentage,
}: {
  type: string;
  percentage: number;
}) => {
  return (
    <div
      className={cx(
        'flex w-full flex-col md:flex-row gap-x-0 gap-y-2 items-center justify-evenly',
      )}
    >
      <div className="flex flex-col gap-y-1 md:min-w-[100px] lg:min-w-[200px]">
        <data className={'text-2xl text-gray-700 dark:text-gray-300 uppercase'}>
          {type}
        </data>
      </div>
      <div className="flex flex-col gap-y-1">
        <data className="text-sm text-gray-500 dark:text-gray-400">Compliance %</data>
        <data className={'text-2xl text-gray-700 dark:text-gray-300'}>
          {percentage.toFixed(2)}%
        </data>
      </div>
    </div>
  );
};

const SeverityChart = ({ counts }: { counts: SeverityType[] }) => {
  const maxValue = Math.max(...counts.map((v) => v.value));
  if (counts.length === 0) {
    return <div className="flex items-center w-full justify-center">No Data</div>;
  }
  return (
    <div>
      {counts.map(({ name, value }) => {
        return (
          <div className="flex items-center w-full" key={name}>
            <data
              className="pr-2 text-sm min-w-[60px] text-gray-500 text-end dark:text-gray-400"
              value={value}
            >
              {name}
            </data>
            <div className={cx('w-[80%] overflow-hidden flex items-center')}>
              <div
                className={cx('rounded h-2 relative', color[name.toLowerCase()])}
                style={{
                  width: `${(100 / maxValue) * value}%`,
                }}
              ></div>
              <data className="ml-2 right-0 top-0 text-xs text-gray-500 dark:text-gray-400">
                {value}
              </data>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Scan = ({ scanData }: { scanData: ScanData }) => {
  if (!scanData) {
    return null;
  }
  const { benchmarkResults } = scanData;

  return (
    <Card>
      <div className="grid grid-cols-[250px_1fr] items-center">
        <Account scanData={scanData} />
        <div className="flex flex-col">
          {benchmarkResults.map((benchmarkResult, index) => {
            const { data, compliancePercentage, benchmarkType } = benchmarkResult;
            return (
              <div key={benchmarkType}>
                {index !== 0 ? (
                  <Separator className="mx-6 h-[1px] bg-gray-100 dark:bg-gray-700" />
                ) : null}
                <div className="flex flex-col p-4">
                  <div className="grid grid-cols-[3fr_2fr]">
                    <BenchmarkTypeAndPercentage
                      type={benchmarkType}
                      percentage={compliancePercentage}
                    />
                    <SeverityChart counts={data.counts ?? []} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

const ComplianceScanSummary = () => {
  const loaderData = useLoaderData() as LoaderDataType;

  return (
    <div className="flex flex-col">
      <ConnectorHeader
        title={'Compliance Scan Results Summary'}
        description={'Summary of compliance scan result'}
      />

      <Link
        to="/dashboard"
        className={cx(
          `${Typography.size.sm} `,
          'underline underline-offset-2 ml-auto bg-transparent text-blue-600 dark:text-blue-500',
        )}
      >
        Go to Posture dashboard to view detailed scan results
      </Link>

      <div className="flex flex-col gap-4 mt-4">
        <Suspense
          fallback={
            <div className="w-full mt-16 flex justify-center">
              <CircleSpinner />
            </div>
          }
        >
          <Await resolve={loaderData.data ?? []}>
            {(resolvedData: ScanData[] | undefined) => {
              return resolvedData?.map((accountScanData, index) => (
                <Scan
                  key={`${accountScanData?.accountName}-${index}`}
                  scanData={accountScanData}
                />
              ));
            }}
          </Await>
        </Suspense>
      </div>
    </div>
  );
};

export const module = {
  loader,
  element: <ComplianceScanSummary />,
};
