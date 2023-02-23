import cx from 'classnames';
import { isEmpty } from 'lodash-es';
import { Suspense } from 'react';
import { IconContext } from 'react-icons/lib';
import { Await, Link, LoaderFunctionArgs, useLoaderData } from 'react-router-dom';
import { Card, CircleSpinner, Typography } from 'ui-components';

import { getSecretApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelScanInfo,
  ModelSecretScanResult,
} from '@/api/generated';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { IconMapForNodeType } from '@/features/onboard/components/IconMapForNodeType';
import { statusScanApiFunctionMap } from '@/features/onboard/pages/ScanInProgress';
import { getAccountName } from '@/features/onboard/utils/summary';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';

const color: { [key: string]: string } = {
  alarm: 'bg-red-400 dark:bg-red-500',
  info: 'bg-blue-400 dark:bg-blue-500',
  ok: 'bg-green-400 dark:bg-green-500',
  skip: 'bg-gray-400 dark:bg-gray-500',
  critical: 'bg-red-400 dark:bg-red-500',
  high: 'bg-pink-400 dark:bg-pink-500',
  low: 'bg-yellow-300 dark:bg-yellow-500',
  medium: 'bg-blue-400 dark:bg-blue-500',
  unknown: 'bg-gray-400 dark:bg-gray-500',
};

type ScanType = {
  total: number;
  counts: SeverityType[] | null;
};
type SeverityType = {
  name: string;
  value: number;
};

type ScanData = {
  accountName: string;
  accountType: string;
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

async function getScanSummary(scanIds: string[]): Promise<ScanData[]> {
  const bulkRequest = scanIds.map((scanId) => {
    return makeRequest({
      apiFunction: getSecretApiClient().resultSecretScan,
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
    accNonEmpty: ModelSecretScanResult[];
    accEmpty: ModelSecretScanResult[];
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
      if (isEmpty(response.severity_counts)) {
        initial.accEmpty.push(response);
      } else {
        initial.accNonEmpty.push(response);
      }
    }
  });
  const resultData = responses.map((response) => {
    if (ApiError.isApiError(response)) {
      // TODO: handle any one request has an error on this bulk request
      return null;
    }
    return {
      accountName: getAccountName(response),
      accountType: response.node_type,
      data: [
        {
          total: Object.keys(response.severity_counts ?? {}).reduce((acc, severity) => {
            acc = acc + (response.severity_counts?.[severity] ?? 0);
            return acc;
          }, 0),
          counts: Object.keys(response.severity_counts ?? {}).map((severity) => {
            return {
              name: severity,
              value: response.severity_counts?.[severity] ?? 0,
            };
          }),
        },
      ],
    };
  });

  const resultWithEmptySeverityAtEnd = resultData.concat(
    initial.accEmpty.map((response) => {
      return {
        accountName: getAccountName(response),
        accountType: response.node_type,
        data: [
          {
            total: 0,
            counts: [],
          },
        ],
      };
    }),
  );
  return resultWithEmptySeverityAtEnd;
}

async function getScanStatus(bulkScanId: string): Promise<Array<ModelScanInfo>> {
  const result = await makeRequest({
    apiFunction: statusScanApiFunctionMap['secret'],
    apiArgs: [
      {
        modelScanStatusReq: {
          scan_ids: [],
          bulk_scan_id: bulkScanId,
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

  return Object.values(result.statuses ?? {});
}

const loader = async ({
  params = {
    bulkScanId: '',
  },
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  const { bulkScanId } = params;
  if (!bulkScanId?.length) {
    throw new Error('Invalid params');
  }
  const statuses = await getScanStatus(bulkScanId);
  const scanIds =
    statuses
      ?.filter((status) => status?.status === 'COMPLETE')
      .map((status) => status.scan_id) ?? [];

  return typedDefer({
    data: getScanSummary(scanIds),
  });
};

const Account = ({ scanData }: { scanData: ScanData }) => {
  return (
    <div
      className={cx(
        'h-full flex flex-col items-center justify-center gap-y-3',
        'border-r dark:border-gray-700',
        'bg-gray-100 dark:bg-gray-700',
        'p-2',
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

const TypeAndCountComponent = ({ total }: { total: number }) => {
  return (
    <div className="flex flex-col gap-y-1 items-center justify-center">
      <data className="text-sm text-gray-400 dark:text-gray-500">Total Issues</data>
      <data className={'text-[2rem] text-gray-900 dark:text-gray-200 font-light'}>
        {total}
      </data>
    </div>
  );
};

const ChartComponent = ({ counts }: { counts: SeverityType[] }) => {
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
              className="pr-2 text-sm min-w-[100px] text-gray-500 text-end dark:text-gray-400"
              value={value}
            >
              {name.charAt(0).toUpperCase() + name.slice(1)}
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
  const { data = [] } = scanData;

  return (
    <Card>
      <div className="grid grid-cols-[450px_1fr] items-center">
        <Account scanData={scanData} />
        <div className="flex flex-col">
          {data.map((severityData: ScanType | null, index: number) => {
            const { counts = [], total = 0 } = severityData ?? {};
            return (
              <div className="flex flex-col p-4" key={index}>
                <div className="grid grid-cols-[40%_60%]">
                  <TypeAndCountComponent total={total} />
                  {counts && <ChartComponent counts={counts} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

const SecretScanSummary = () => {
  const loaderData = useLoaderData() as LoaderDataType;

  return (
    <div className="flex flex-col">
      <ConnectorHeader
        title={'Secret Scan Results Summary'}
        description={'Summary of secret scan result'}
      />

      <Link
        to="/dashboard"
        className={cx(
          `${Typography.size.sm} `,
          'underline underline-offset-2 ml-auto bg-transparent text-blue-600 dark:text-blue-500',
        )}
      >
        Go to Secret Dashboard to view details scan result
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
  element: <SecretScanSummary />,
};
