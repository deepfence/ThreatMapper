import cx from 'classnames';
import { uniq } from 'lodash-es';
import { useMemo, useState } from 'react';
import { FaCheckDouble, FaExclamationTriangle } from 'react-icons/fa';
import {
  HiCheck,
  HiChevronDown,
  HiChevronRight,
  HiChevronUp,
  HiExclamationCircle,
  HiOutlineChevronDoubleLeft,
  HiOutlineChevronDoubleRight,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import {
  generatePath,
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

import {
  getCloudComplianceApiClient,
  getComplianceApiClient,
  getMalwareApiClient,
  getSecretApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import { ModelScanInfo } from '@/api/generated';
import { ModelComplianceScanInfo } from '@/api/generated/models/ModelComplianceScanInfo';
import { ScanLoader } from '@/components/ScanLoader';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { apiWrapper } from '@/utils/api';
import { usePageNavigation } from '@/utils/usePageNavigation';

export type LoaderDataType = {
  error?: string;
  message?: string;
  data?: (ModelComplianceScanInfo | ModelScanInfo)[];
};

type TableDataType = ModelComplianceScanInfo | ModelScanInfo;

type TextProps = {
  scanningText: string;
  headerText: string;
  subHeaderText: string;
};

type ConfigProps = {
  vulnerability: TextProps;
  secret: TextProps;
  malware: TextProps;
  compliance: TextProps;
  alert: TextProps;
};

export const statusScanApiFunctionMap = {
  vulnerability: getVulnerabilityApiClient().statusVulnerabilityScan,
  secret: getSecretApiClient().statusSecretScan,
  malware: getMalwareApiClient().statusMalwareScan,
  compliance: getComplianceApiClient().statusComplianceScan,
  cloudCompliance: getCloudComplianceApiClient().statusCloudComplianceScan,
};

const configMap: ConfigProps = {
  vulnerability: {
    scanningText: 'Your Vulnerability Scan is currently running...',
    headerText: 'Vulnerability Scan',
    subHeaderText:
      'Vulnerability Scan has been initiated, it will be completed in few moments.',
  },
  secret: {
    scanningText: 'Your Secret Scan is currently running...',
    headerText: 'Secret Scan',
    subHeaderText: 'Secret Scan has been initiated, it will be completed in few moments.',
  },
  malware: {
    scanningText: 'Your Malware Scan is currently running...',
    headerText: 'Malware Scan',
    subHeaderText:
      'Malware Scan has been initiated, it will be completed in few moments.',
  },
  compliance: {
    scanningText: 'Your Posture Scan is currently running...',
    headerText: 'Posture Scan',
    subHeaderText:
      'Posture Scan has been initiated, it will be completed in few moments.',
  },
  alert: {
    scanningText: 'Your Vulnerability Scan is currently running...',
    headerText: 'Vulnerability Scan',
    subHeaderText:
      'Vulnerability Scan has been initiated, it will be completed in few moments.',
  },
};

async function getScanStatus(
  scanType: keyof typeof statusScanApiFunctionMap,
  bulkScanId: string,
  nodeType: string,
): Promise<LoaderDataType> {
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
    throw statusResponse.error;
  }

  if (statusResponse.value === null) {
    return {
      data: [],
    };
  }
  if (statusResponse.value.statuses && Array.isArray(statusResponse.value.statuses)) {
    return {
      data: statusResponse.value.statuses,
    };
  }

  return {
    data: Object.values(statusResponse.value.statuses ?? {}),
  };
}

const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderDataType> => {
  const nodeType = params?.nodeType ?? '';
  const bulkScanId = params?.bulkScanId ?? '';
  const scanType = params?.scanType as keyof typeof statusScanApiFunctionMap;
  return await getScanStatus(scanType, bulkScanId, nodeType);
};

function areAllScanDone(scanStatuses: string[]) {
  return (
    scanStatuses.filter((status) => {
      return ['COMPLETE', 'ERROR'].includes(status);
    }).length === scanStatuses.length
  );
}

function areAllScanFailed(scanStatuses: string[]) {
  return (
    scanStatuses.filter((status) => {
      return ['ERROR'].includes(status);
    }).length === scanStatuses.length
  );
}

function isScanDone(status: string) {
  return status === 'COMPLETE' || status === 'ERROR';
}

function isScanCompleted(status: string) {
  return status === 'COMPLETE';
}

function isScanFailed(status: string) {
  return status === 'ERROR';
}

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

const ScanInProgress = () => {
  const params = useParams();
  const { navigate } = usePageNavigation();
  const loaderData = useLoaderData() as LoaderDataType;
  const revalidator = useRevalidator();
  const [expand, setExpand] = useState(false);

  const { scanType, bulkScanId } = params as {
    scanType: keyof ConfigProps;
    bulkScanId: string;
  };
  const textMap = configMap[scanType];
  const columnHelper = createColumnHelper<TableDataType>();

  const allScanFailed = areAllScanFailed(
    loaderData?.data?.map((data) => data.status) ?? [],
  );
  const allScanDone = areAllScanDone(loaderData?.data?.map((data) => data.status) ?? []);

  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('node_type', {
        cell: (info) => {
          return (
            <span className="capitalize">{info.getValue()?.replaceAll('_', ' ')}</span>
          );
        },
        header: () => 'Type',
        minSize: 50,
        size: 70,
      }),
      columnHelper.accessor('node_id', {
        cell: (info) => info.getValue(),
        header: () => 'Name',
        minSize: 125,
        size: 150,
      }),
    ];

    columns.push(
      columnHelper.accessor((row) => row.status, {
        id: 'status',
        minSize: 50,
        size: 70,
        cell: (info) => {
          let color = null;
          let icon = null;
          if (!isScanDone(info.row.original.status)) {
            color = 'text-blue-500';
            icon = <CircleSpinner size="xs" className="mr-2" />;
          } else if (isScanCompleted(info.row.original.status)) {
            color = 'text-green-500';
            icon = <HiCheck />;
          } else if (isScanFailed(info.row.original.status)) {
            color = 'text-red-500';
            icon = <HiExclamationCircle />;
          }
          return (
            <div className={cx(`${color} flex items-center gap-x-2`)}>
              {info.getValue().replaceAll('_', ' ')}
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
    );
    columns.push(
      getRowExpanderColumn(columnHelper, {
        minSize: 30,
        size: 30,
        maxSize: 30,
        cell: ({ row }) => {
          if (!isScanFailed(row.original.status)) {
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
    );
    return columns;
  }, [loaderData.data]);

  useInterval(() => {
    if (!loaderData.message && !allScanDone) {
      revalidator.revalidate();
    }
  }, 10000);

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
                  'text-green-500': !allScanFailed,
                  'text-red-500': allScanFailed,
                }),
              }}
            >
              {allScanFailed ? <HiOutlineExclamationCircle /> : <FaCheckDouble />}
            </IconContext.Provider>
            <h3 className="text-2xl font-semibold pt-1 dark:text-gray-200">
              Scan {allScanFailed ? 'Failed' : 'Done'}
            </h3>
            <div className="mt-6">
              {allScanFailed ? (
                <Button
                  size="sm"
                  startIcon={<HiOutlineChevronDoubleLeft />}
                  onClick={() => navigate('/onboard/connectors/my-connectors')}
                  color="primary"
                  type="button"
                >
                  Go back to try again
                </Button>
              ) : (
                <Button
                  size="sm"
                  endIcon={<HiOutlineChevronDoubleRight />}
                  onClick={() =>
                    navigate(
                      generatePath(
                        `/onboard/scan/view-summary/${scanType}/:nodeType/:bulkScanId`,
                        {
                          nodeType: loaderData?.data?.[0]?.node_type ?? '',
                          bulkScanId,
                        },
                      ),
                    )
                  }
                  color="primary"
                >
                  Go to scan results
                </Button>
              )}
            </div>
          </>
        )}

        <div
          className={cx('flex justify-center items-center', {
            'mt-10': allScanDone,
            '-mt-10': !allScanDone,
          })}
        >
          <p className="text-sm text-gray-700 dark:text-gray-200">
            {!allScanDone
              ? `${
                  scanType.charAt(0).toUpperCase() + scanType.slice(1)
                } scan started for ${loaderData?.data?.length} ${uniq(
                  loaderData.data?.map((data) => data.node_type?.replace('_', ' ')) ?? [],
                ).join(' and ')}${(loaderData?.data?.length ?? 0) > 1 ? 's' : ''}`
              : 'All the scan are done'}
          </p>
        </div>
        <Button
          size="sm"
          endIcon={expand ? <HiChevronUp /> : <HiChevronDown />}
          onClick={() => setExpand((state) => !state)}
          color={expand ? 'primary' : 'normal'}
          outline={expand ? false : true}
          className="mt-4"
        >
          {expand ? 'Less' : 'More'} details
        </Button>
      </section>
      {expand ? (
        <section className="mt-4 flex justify-center ">
          <div className="max-w-[900px]">
            <Table
              size="sm"
              data={loaderData.data ?? []}
              columns={columns}
              getRowCanExpand={() => {
                return true;
              }}
              renderSubComponent={({ row }) => {
                return (
                  <p className="text-red-500 py-2 px-4 overflow-auto text-sm">
                    {row.original.status_message}
                  </p>
                );
              }}
            />
          </div>
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
