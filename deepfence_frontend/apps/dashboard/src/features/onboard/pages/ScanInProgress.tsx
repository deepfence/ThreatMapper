import cx from 'classnames';
import { useEffect, useMemo, useState } from 'react';
import { FaCheckDouble, FaExclamationTriangle, FaStream } from 'react-icons/fa';
import {
  HiCheck,
  HiChevronDown,
  HiChevronRight,
  HiExclamationCircle,
  HiOutlineChevronDoubleRight,
  HiOutlineChevronRight,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import {
  Link,
  LoaderFunctionArgs,
  useLoaderData,
  useParams,
  useRevalidator,
} from 'react-router-dom';
import { useInterval } from 'react-use';
import {
  Button,
  CircleSpinner,
  createColumnHelper,
  getRowExpanderColumn,
  Table,
} from 'ui-components';

import { vulnerabilityScanApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelScanStatusResp } from '@/api/generated';
import { ScanLoader } from '@/components/ScanLoader';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { ApiError, makeRequest } from '@/utils/api';

export const ScanInProgressError = () => {
  return (
    <>
      <ConnectorHeader
        title={'Scan Error'}
        description={'An error has occured, please retry.'}
      />
      <div className="flex flex-col items-center">
        <IconContext.Provider
          value={{
            className: 'w-[70px] h-[70px] dark:text-gray-400 text-gray-900',
          }}
        >
          <FaExclamationTriangle />
        </IconContext.Provider>
        <p className="text-sm text-red-500 mt-3">
          Opps! An error has occured during your scan, please try again
        </p>

        <Link
          to="/onboard/connectors/my-connectors"
          className={cx(
            `test-sm mt-2`,
            'underline underline-offset-4 bg-transparent text-blue-600 dark:text-blue-500',
          )}
        >
          Try Again
        </Link>
      </div>
    </>
  );
};

const statusScanApiFunctionMap = {
  vulnerability: vulnerabilityScanApiClient().statusVulnerabilityScan,
};

export type LoaderDataType = {
  error?: string;
  message?: string;
  data?: {
    [key: string]: string;
  } | null;
};

async function getScanStatus(
  scanType: keyof typeof statusScanApiFunctionMap,
  bulkScanId: string,
): Promise<LoaderDataType> {
  const r = await makeRequest({
    apiFunction: statusScanApiFunctionMap[scanType],
    apiArgs: [
      {
        scanIds: [],
        bulkScanId,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<LoaderDataType>({});
      if (r.status === 400 || r.status === 500) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });
  if (ApiError.isApiError(r)) {
    throw r.value();
  }
  const result = r as ModelScanStatusResp;
  return {
    data: {
      'dev-agent-cluster-pool-4vgtqrhcq-m91ov-1675323869': SCAN_STATUS_FAILED,
      'dev-agent-cluster-pool-4vgtqrhcq-m91ov-167532386911': SCAN_STATUS_FAILED,
    },
  };
}

const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderDataType> => {
  const bulkScanId = params?.bulkScanId ?? '';
  const scanType = params?.scanType as keyof typeof statusScanApiFunctionMap;

  return await getScanStatus(scanType, bulkScanId);
};

type TextProps = {
  scanningText: string;
  headerText: string;
  subHeaderText: string;
};
type ConfigProps = {
  vulnerability: TextProps;
  secret: TextProps;
  malware: TextProps;
  posture: TextProps;
  alert: TextProps;
};

const configMap: ConfigProps = {
  vulnerability: {
    scanningText: 'Your Vulnerability Scan is currently running...',
    headerText: 'Vulnerability Scan',
    subHeaderText:
      'Vulnerability Scan has been initiated, it will be completed in few moments.',
  },
  secret: {
    scanningText: 'Your Vulnerability Scan is currently running...',
    headerText: 'Vulnerability Scan',
    subHeaderText:
      'Vulnerability Scan has been initiated, it will be completed in few moments.',
  },
  malware: {
    scanningText: 'Your Vulnerability Scan is currently running...',
    headerText: 'Vulnerability Scan',
    subHeaderText:
      'Vulnerability Scan has been initiated, it will be completed in few moments.',
  },
  posture: {
    scanningText: 'Your Vulnerability Scan is currently running...',
    headerText: 'Vulnerability Scan',
    subHeaderText:
      'Vulnerability Scan has been initiated, it will be completed in few moments.',
  },
  alert: {
    scanningText: 'Your Vulnerability Scan is currently running...',
    headerText: 'Vulnerability Scan',
    subHeaderText:
      'Vulnerability Scan has been initiated, it will be completed in few moments.',
  },
};

type TableDataType = {
  account: string;
  status: string;
};

const SCAN_STATUS_IN_PROGRESS = 'IN_PROGRESS';
const SCAN_STATUS_GENERATING_SBOM = 'GENERATING_SBOM';
const SCAN_STATUS_IN_COMPLETE = 'COMPLETE';
const SCAN_STATUS_FAILED = 'FAILED';

const ScanInProgress = () => {
  const params = useParams();
  const loaderData = useLoaderData() as LoaderDataType;
  const revalidator = useRevalidator();
  const [isAllScanFailed, setIsAllScanFailed] = useState(false);
  const [expand, setExpand] = useState(false);
  const [allScanDone, setAllScanDone] = useState(false);

  const { scanType } = params as { scanType: keyof ConfigProps };
  const textMap = configMap[scanType];

  const columnHelper = createColumnHelper<TableDataType>();
  const tableData = Object.keys(loaderData.data || []).map((id: string) => {
    return {
      account: id,
      status: loaderData.data?.[id] ?? '',
    };
  });

  const columns = useMemo(
    () => [
      columnHelper.accessor('account', {
        cell: (info) => info.getValue(),
        header: () => 'Name',
        minSize: 500,
      }),
      columnHelper.accessor((row) => row.status, {
        id: 'status',
        cell: (info) => {
          let color = null;
          let icon = null;
          if (
            [SCAN_STATUS_IN_PROGRESS, SCAN_STATUS_GENERATING_SBOM].includes(
              info.row.original.status,
            )
          ) {
            color = 'text-blue-500';
            icon = <CircleSpinner size="xs" className="mr-2" />;
          } else if (info.row.original.status.toLowerCase() === 'complete') {
            color = 'text-green-500';
            icon = <HiCheck />;
          } else if (info.row.original.status === SCAN_STATUS_FAILED) {
            color = 'text-red-500';
            icon = <HiExclamationCircle />;
          }
          return (
            <div className={cx(`${color} flex items-center gap-x-2`)}>
              {info.getValue()}
              <IconContext.Provider
                value={{
                  className: `${color} w-4 h-4 mr-2`,
                }}
              >
                {icon}
              </IconContext.Provider>
            </div>
          );
        },
        header: () => <span>Status</span>,
      }),
      getRowExpanderColumn(columnHelper, {
        minSize: 10,
        size: 10,
        maxSize: 10,
        cell: ({ row }) => {
          if (
            [SCAN_STATUS_IN_PROGRESS, SCAN_STATUS_IN_COMPLETE].includes(
              row.original.status,
            )
          ) {
            return null;
          }
          return row.getCanExpand() ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                row.getToggleExpandedHandler()();
              }}
            >
              {row.getIsExpanded() ? <HiChevronDown /> : <HiChevronRight />}
            </button>
          ) : null;
        },
      }),
    ],
    [],
  );

  useEffect(() => {
    if (loaderData.data) {
      let allDone = true;
      for (const id in loaderData.data) {
        const status = loaderData.data[id];
        if (
          status === SCAN_STATUS_IN_PROGRESS ||
          status === SCAN_STATUS_GENERATING_SBOM
        ) {
          allDone = false;
        } else {
          const set = new Set(Object.values(loaderData.data));
          if (set.size === 1) {
            const values = [...set];
            setIsAllScanFailed(values[0] === SCAN_STATUS_FAILED);
          }
        }
      }

      if (allDone) {
        setAllScanDone(true);
      }
    }
  }, [loaderData]);

  useInterval(() => {
    if (!allScanDone) {
      revalidator.revalidate();
    }
  }, 5000);

  return (
    <>
      <ConnectorHeader title={textMap.headerText} description={textMap.subHeaderText} />
      <section className="flex flex-col justify-center items-center">
        {!allScanDone ? (
          <ScanLoader text={''} />
        ) : (
          <>
            <IconContext.Provider
              value={{
                className: cx('w-[80px] h-[80px]', {
                  'text-green-500': !isAllScanFailed,
                  'text-red-500': isAllScanFailed,
                }),
              }}
            >
              {isAllScanFailed ? <HiOutlineExclamationCircle /> : <FaCheckDouble />}
            </IconContext.Provider>
            <h3 className="text-2xl font-semibold pt-1">
              Scan {isAllScanFailed ? 'Failed' : 'Completed'}
            </h3>
            <div className="mt-6">
              <Button
                size="sm"
                endIcon={<HiOutlineChevronDoubleRight />}
                onClick={() => setExpand((state) => !state)}
                color="primary"
                disabled={isAllScanFailed}
              >
                Go to scan results
              </Button>
            </div>
          </>
        )}

        <div
          className={cx('flex justify-center items-center', {
            'mt-10': allScanDone,
            '-mt-10': !allScanDone,
          })}
        >
          <p className="text-sm">
            {!allScanDone
              ? `${
                  scanType.charAt(0).toUpperCase() + scanType.slice(1)
                } Scan has been started for ${tableData.length} hosts`
              : 'All scan has been finished'}
          </p>
          <Button
            size="sm"
            startIcon={<FaStream />}
            endIcon={<HiOutlineChevronRight />}
            onClick={() => setExpand((state) => !state)}
            color="normal"
            className="ring-0 outline-none focus:ring-0 hover:bg-transparent"
          >
            Click here to {expand ? 'collapse' : 'see'} details
          </Button>
        </div>
      </section>
      {expand ? (
        <section className="mt-4 flex justify-center">
          <Table
            size="sm"
            data={tableData}
            columns={columns}
            getRowCanExpand={() => {
              return true;
            }}
            renderSubComponent={({ row }) => {
              return (
                <p className="dark:text-gray-200 py-2 px-4 overflow-auto text-sm">
                  Error message will be here
                </p>
              );
            }}
          />
        </section>
      ) : null}
    </>
  );
};

export const module = {
  loader,
  element: <ScanInProgress />,
  errorElement: <ScanInProgressError />,
};
