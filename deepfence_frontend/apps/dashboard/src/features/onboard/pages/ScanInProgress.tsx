import { useSuspenseQuery } from '@suspensive/react-query';
import { uniq } from 'lodash-es';
import { Suspense, useMemo, useState } from 'react';
import { generatePath, useParams } from 'react-router-dom';
import { useInterval } from 'react-use';
import {
  Button,
  CircleSpinner,
  createColumnHelper,
  getRowExpanderColumn,
  Table,
} from 'ui-components';

import { ModelScanInfo } from '@/api/generated';
import { ModelComplianceScanInfo } from '@/api/generated/models/ModelComplianceScanInfo';
import { DFLink } from '@/components/DFLink';
import { ArrowLine } from '@/components/icons/common/ArrowLine';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { ErrorIcon, SuccessIcon } from '@/components/icons/common/ScanStatuses';
import { ScanLoader } from '@/components/ScanLoader';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { TruncatedText } from '@/components/TruncatedText';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { invalidateAllQueries, queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';
import { usePageNavigation } from '@/utils/usePageNavigation';

type TableDataType = ModelComplianceScanInfo | ModelScanInfo;

type TextProps = {
  scanningText: string;
  headerText: string;
  subHeaderText: string;
};

type ConfigProps = {
  [ScanTypeEnum.VulnerabilityScan]: TextProps;
  [ScanTypeEnum.SecretScan]: TextProps;
  [ScanTypeEnum.MalwareScan]: TextProps;
  [ScanTypeEnum.ComplianceScan]: TextProps;
  [ScanTypeEnum.CloudComplianceScan]: TextProps;
  alert: TextProps;
};

const configMap: ConfigProps = {
  [ScanTypeEnum.VulnerabilityScan]: {
    scanningText: 'Your Vulnerability Scan is currently running...',
    headerText: 'Vulnerability Scan',
    subHeaderText:
      'Vulnerability Scan has been initiated, it will be completed in few moments.',
  },
  [ScanTypeEnum.SecretScan]: {
    scanningText: 'Your Secret Scan is currently running...',
    headerText: 'Secret Scan',
    subHeaderText: 'Secret Scan has been initiated, it will be completed in few moments.',
  },
  [ScanTypeEnum.MalwareScan]: {
    scanningText: 'Your Malware Scan is currently running...',
    headerText: 'Malware Scan',
    subHeaderText:
      'Malware Scan has been initiated, it will be completed in few moments.',
  },
  [ScanTypeEnum.ComplianceScan]: {
    scanningText: 'Your Posture Scan is currently running...',
    headerText: 'Posture Scan',
    subHeaderText:
      'Posture Scan has been initiated, it will be completed in few moments.',
  },
  [ScanTypeEnum.CloudComplianceScan]: {
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

const useScanInProgress = () => {
  const params = useParams();
  const bulkScanId = params?.bulkScanId ?? '';
  const scanType = params?.scanType as ScanTypeEnum;
  return useSuspenseQuery({
    ...queries.onboard.scanStatus({
      bulkScanId,
      scanType,
    }),
  });
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

function isScanFailed(status: string) {
  return status === 'ERROR';
}

export const ScanInProgressError = () => {
  return (
    <>
      <ConnectorHeader
        title={'Scan Error'}
        description={'An error has occurred, please retry.'}
      />
      <div className="flex flex-col items-center">
        <span className="w-[70px] h-[70px] text-status-error">
          <ErrorIcon />
        </span>
        <p className="text-p7 text-status-error mt-4">
          An error has occurred during your scan, please try again
        </p>

        <DFLink to="/onboard/connectors/my-connectors" className="mt-2">
          Try again
        </DFLink>
      </div>
    </>
  );
};
const ScanStatus = () => {
  const params = useParams();
  const { scanType, bulkScanId } = params as {
    scanType: keyof ConfigProps;
    bulkScanId: string;
  };
  const { data } = useScanInProgress();

  const allScanFailed = areAllScanFailed(data?.data?.map((data) => data.status) ?? []);
  const allScanDone = areAllScanDone(data?.data?.map((data) => data.status) ?? []);

  useInterval(() => {
    if (!data.message && !allScanDone) {
      invalidateAllQueries();
    }
  }, 10000);

  const { navigate } = usePageNavigation();
  const [expand, setExpand] = useState(false);

  const columnHelper = createColumnHelper<TableDataType>();
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('node_type', {
        enableSorting: true,
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
        enableSorting: true,
        cell: (info) => <TruncatedText text={info.getValue()} />,
        header: () => 'Name',
        minSize: 125,
        size: 150,
      }),
    ];

    columns.push(
      columnHelper.accessor((row) => row.status, {
        enableSorting: true,
        id: 'status',
        minSize: 50,
        size: 70,
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
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
              {row.getIsExpanded() ? (
                <span className="w-4 h-4 block">
                  <CaretDown />
                </span>
              ) : (
                <span className="w-4 h-4 block -rotate-90">
                  <CaretDown />
                </span>
              )}
            </button>
          ) : null;
        },
      }),
    );
    return columns;
  }, [data]);

  return (
    <>
      <section className="flex flex-col justify-center items-center">
        {!allScanDone && !allScanFailed ? (
          <ScanLoader text={''} />
        ) : (
          <>
            {allScanFailed ? (
              <span className="w-20 h-20 text-status-error">
                <ErrorIcon />
              </span>
            ) : (
              <span className="w-20 h-20">
                <SuccessIcon />
              </span>
            )}
            <h3 className="text-h2 pt-1 text-text-text-and-icon">
              Scan {allScanFailed ? 'failed' : 'done'}
            </h3>
            <div className="mt-2">
              {allScanFailed ? (
                <Button
                  variant="flat"
                  size="sm"
                  color="error"
                  startIcon={<ArrowLine className="-rotate-90" />}
                  onClick={() => navigate('/onboard/connectors/my-connectors')}
                  type="button"
                >
                  Go back to try again
                </Button>
              ) : (
                <Button
                  variant="flat"
                  size="sm"
                  endIcon={<ArrowLine className="rotate-90" />}
                  onClick={() =>
                    navigate(
                      generatePath(
                        `/onboard/scan/view-summary/${scanType}/:nodeType/:bulkScanId`,
                        {
                          nodeType: data?.data?.[0]?.node_type ?? '',
                          bulkScanId: encodeURIComponent(bulkScanId),
                        },
                      ),
                    )
                  }
                >
                  Go to result summary
                </Button>
              )}
            </div>
          </>
        )}

        <div className="flex justify-center items-center mt-6">
          <p className="text-p4 text-text-text-and-icon">
            {!allScanDone &&
              `${
                scanType.charAt(0).toUpperCase() + scanType.slice(1)
              } scan started for ${data?.data?.length} ${uniq(
                data.data?.map((data) => data.node_type?.replace('_', ' ')) ?? [],
              ).join(' and ')}${(data?.data?.length ?? 0) > 1 ? 's' : ''}, ${
                allScanFailed
                  ? 'All scans failed.'
                  : 'It will take some times to complete.'
              }`}

            {allScanDone && 'All scans complete'}
          </p>
        </div>
        {!allScanDone && !allScanFailed && (
          <div className="text-p4 text-text-text-and-icon mt-4 flex items-center flex-col">
            <span>
              You can either wait for the scan to complete to see summary of scan result
              or go to main dashbord to see details of your scan.
            </span>
            <span>
              If you wish to start a new scan you can click on &quot;Go to add
              connectors&quot;
            </span>
            <div className="flex mt-4 gap-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/onboard/connectors/add-connectors')}
              >
                go to add connectors
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
                go to main dashboard
              </Button>
            </div>
          </div>
        )}
        {allScanDone && (
          <div className="text-p4 text-text-text-and-icon mt-4 flex items-center flex-col">
            <span>
              If you wish to start a new scan you can click on &quot;Go to add
              connectors&quot;
            </span>
            <div className="flex mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/onboard/connectors/add-connectors')}
              >
                go to add connectors
              </Button>
            </div>
          </div>
        )}
        <Button
          size="sm"
          variant="flat"
          color={allScanFailed ? 'error' : 'default'}
          endIcon={
            expand ? (
              <span className="rotate-180">
                <CaretDown />
              </span>
            ) : (
              <span className="block -rotate-90">
                <CaretDown />
              </span>
            )
          }
          onClick={() => setExpand((state) => !state)}
          outline={expand ? false : true}
          className="mt-4"
        >
          {expand ? 'Less' : 'scan status'} details
        </Button>
      </section>
      {expand ? (
        <section className="mt-4 flex justify-center ">
          <div className="max-w-[900px]">
            <Table
              enableSorting
              size="default"
              data={data.data ?? []}
              columns={columns}
              getRowCanExpand={() => {
                return true;
              }}
              renderSubComponent={({ row }) => {
                return (
                  <p className="text-status-error py-2 px-4 overflow-auto text-p7">
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
const ScanInProgress = () => {
  const params = useParams();

  const { scanType } = params as {
    scanType: keyof ConfigProps;
    bulkScanId: string;
  };
  const textMap = configMap[scanType];

  return (
    <>
      <ConnectorHeader title={textMap.headerText} description={textMap.subHeaderText} />
      <Suspense fallback={<CircleSpinner size="md" />}>
        <ScanStatus />
      </Suspense>
    </>
  );
};

export const module = {
  element: <ScanInProgress />,
  errorElement: <ScanInProgressError />,
};
