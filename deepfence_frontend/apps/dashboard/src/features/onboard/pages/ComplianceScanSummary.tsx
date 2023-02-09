import cx from 'classnames';
import { Suspense } from 'react';
import { Await, Link, LoaderFunctionArgs, useLoaderData } from 'react-router-dom';
import { Card, CircleSpinner, Separator, Typography } from 'ui-components';

import { getCloudComplianceApiClient, getComplianceApiClient } from '@/api/api';
import {
  ModelCloudComplianceScanResult,
  ModelComplianceScanResult,
} from '@/api/generated';
import LogoAws from '@/assets/logo-aws.svg';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';

const color: { [key: string]: string } = {
  alarm: 'bg-red-400 dark:bg-red-500',
  info: 'bg-blue-400 dark:bg-blue-500',
  ok: 'bg-green-400 dark:bg-green-500',
  skip: 'bg-gray-400 dark:bg-gray-500',
};

type ScanType = {
  type: string;
  percentage: number;
  values: SeverityType[];
};
type SeverityType = {
  name: string;
  value: number;
};

type ScanData = {
  accountId: ModelComplianceScanResult['kubernetes_cluster_name'];
  type: string;
  data: {
    total: number;
    counts: SeverityType[] | null;
  }[];
} | null;

export type LoaderDataType = {
  error?: string;
  message?: string;
  data?: ScanData[];
};

const makeCloudComplianceScanSummary = async (scanIds: string) => {
  const bulkRequest = scanIds.split(',').map((scanId) => {
    return makeRequest({
      apiFunction: getCloudComplianceApiClient().resultCloudComplianceScan,
      apiArgs: [
        {
          modelScanResultsReq: {
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
  const resultData = responses.map(
    (response: ModelCloudComplianceScanResult | ApiError<void>) => {
      if (ApiError.isApiError(response)) {
        // TODO: handle any one request has an error on this bulk request
        return null;
      } else {
        const resp = response as ModelComplianceScanResult;
        return {
          accountId: resp.kubernetes_cluster_name,
          data: [
            {
              total: Object.keys(resp.status_counts ?? {}).reduce((acc, severity) => {
                acc = acc + (resp.status_counts?.[severity] ?? 0);
                return acc;
              }, 0),
              counts: Object.keys(resp.status_counts ?? {}).map((severity) => {
                return {
                  name: severity,
                  value: resp.status_counts![severity],
                };
              }),
            },
          ],
        };
      }
    },
  );
  return resultData;
};

const makeComplianceScanSummary = async (scanIds: string) => {
  const bulkRequest = scanIds.split(',').map((scanId) => {
    return makeRequest({
      apiFunction: getComplianceApiClient().resultComplianceScan,
      apiArgs: [
        {
          modelScanResultsReq: {
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
  const resultData = responses.map(
    (response: ModelComplianceScanResult | ApiError<void>) => {
      if (ApiError.isApiError(response)) {
        // TODO: handle any one request has an error on this bulk request
        return null;
      } else {
        const resp = response as ModelComplianceScanResult;
        return {
          accountId: resp.kubernetes_cluster_name,
          data: [
            {
              total: Object.keys(resp.status_counts ?? {}).reduce((acc, severity) => {
                acc = acc + (resp.status_counts?.[severity] ?? 0);
                return acc;
              }, 0),
              counts: Object.keys(resp.status_counts ?? {}).map((severity) => {
                return {
                  name: severity,
                  value: resp.status_counts![severity],
                };
              }),
            },
          ],
        };
      }
    },
  );
  return resultData;
};

async function getScanSummary(
  scanIds: string,
  nodeType: string,
): Promise<LoaderDataType> {
  if (nodeType === 'cloud_account') {
    return {
      data: makeCloudComplianceScanSummary(scanIds),
    };
  } else {
    return {
      data: makeComplianceScanSummary(scanIds),
    };
  }
}

const loader = ({
  params = {
    scanIds: '',
    nodeType: '',
  },
}: LoaderFunctionArgs): TypedDeferredData<LoaderDataType> => {
  return typedDefer({
    data: getScanSummary(params.scanIds ?? '', params.nodeType ?? ''),
  });
};

const AccountComponent = ({ accountId }: { accountId: string }) => {
  return (
    <div
      className={cx(
        'h-full flex flex-col items-center justify-center gap-y-3',
        'border-r dark:border-gray-700',
        'bg-gray-100 dark:bg-gray-700',
      )}
    >
      <img src={LogoAws} alt="logo" height={40} width={40} />
      <data
        className={`${Typography.size.base} ${Typography.weight.normal} text-gray-700 dark:text-gray-300`}
      >
        {accountId}
      </data>
    </div>
  );
};

const TypeAndPercentageComponent = ({
  type,
  percentage,
}: {
  type: string;
  percentage: number;
}) => {
  return (
    <div
      className={cx(
        'flex w-full flex-col md:flex-row gap-x-0 gap-y-2',
        'items-center ml-0 lg:ml-[20%]',
      )}
    >
      <div className="flex flex-col gap-y-1 md:min-w-[100px] lg:min-w-[200px]">
        <data className={'text-2xl text-gray-700 dark:text-gray-300'}>{type}</data>
      </div>
      <div className="flex flex-col gap-y-1">
        <data className="text-sm text-gray-500 dark:text-gray-400">
          Overall Percentage
        </data>
        <data className={'text-2xl text-gray-700 dark:text-gray-300'}>{percentage}%</data>
      </div>
    </div>
  );
};

const ChartComponent = ({ counts }: { counts: SeverityType[] }) => {
  const maxValue = Math.max(...counts.map((v) => v.value));

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
            <div
              className={cx(
                'w-[80%] overflow-hidden flex items-center',
                'cursor-pointer transition duration-100 hover:scale-y-125',
              )}
            >
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
  const { accountId, data = [] } = scanData;

  return (
    <Card>
      <div className="grid grid-cols-[250px_1fr] items-center">
        <AccountComponent accountId={accountId} />
        <div className="flex flex-col">
          {data.map((severityData: ScanType | null, index: number) => {
            const { counts = [], percentage = 0, type = '' } = severityData ?? {};
            return (
              <div key={type}>
                {index > 0 && index < data.length ? (
                  <Separator className="mx-6 h-[1px] bg-gray-100 dark:bg-gray-700" />
                ) : null}
                <div className="flex flex-col p-4">
                  <div className="grid grid-cols-[1fr_1fr]">
                    <TypeAndPercentageComponent type={type} percentage={percentage} />
                    <ChartComponent counts={counts} />
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
        Go to Posture Dashboard to view details scan result
      </Link>

      <div className="flex flex-col gap-4 mt-4">
        <Suspense fallback={<CircleSpinner />}>
          <Await resolve={loaderData.data ?? []}>
            {(resolvedData) => {
              return resolvedData.data?.map((accountScanData: ScanData) => (
                <Scan key={accountScanData?.accountId} scanData={accountScanData} />
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
