import { useSuspenseQuery } from '@suspensive/react-query';
import { uniq } from 'lodash-es';
import { Suspense, useMemo, useState } from 'react';
import { generatePath, useParams, useRevalidator } from 'react-router-dom';
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
import { statusScanApiFunctionMap } from '@/queries/onboard';
import { usePageNavigation } from '@/utils/usePageNavigation';

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

const useScanInProgress = () => {
  const params = useParams();
  const nodeType = params?.nodeType ?? '';
  const bulkScanId = params?.bulkScanId ?? '';
  const scanType = params?.scanType as keyof typeof statusScanApiFunctionMap;
  return useSuspenseQuery({
    ...queries.onboard.scanStatus({
      nodeType,
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
        description={'An error has occured, please retry.'}
      />
      <div className="flex flex-col items-center">
        <span className="w-[70px] h-[70px]">
          <ErrorIcon />
        </span>
        <p className="text-p7 dark:text-status-error mt-4">
          An error has occured during your scan, please try again
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
        {!allScanDone ? (
          <ScanLoader text={''} />
        ) : (
          <>
            {allScanFailed ? (
              <span className="w-20 h-20">
                <ErrorIcon />
              </span>
            ) : (
              <span className="w-20 h-20">
                <SuccessIcon />
              </span>
            )}
            <h3 className="text-h2 pt-1 dark:text-df-gray-200">
              Scan {allScanFailed ? 'Failed' : 'Done'}
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
                  endIcon={
                    <span className="block -rotate-90">
                      <CaretDown />
                    </span>
                  }
                  onClick={() =>
                    navigate(
                      generatePath(
                        `/onboard/scan/view-summary/${scanType}/:nodeType/:bulkScanId`,
                        {
                          nodeType: data?.data?.[0]?.node_type ?? '',
                          bulkScanId,
                        },
                      ),
                    )
                  }
                >
                  Go to scan results
                </Button>
              )}
            </div>
          </>
        )}

        <div className="flex justify-center items-center mt-10">
          <p className="text-p7 text-gray-700 dark:text-text-text-and-icon">
            {!allScanDone
              ? `${
                  scanType.charAt(0).toUpperCase() + scanType.slice(1)
                } scan started for ${data?.data?.length} ${uniq(
                  data.data?.map((data) => data.node_type?.replace('_', ' ')) ?? [],
                ).join(' and ')}${(data?.data?.length ?? 0) > 1 ? 's' : ''}`
              : 'All scan are done'}
          </p>
        </div>
        <Button
          size="sm"
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
          {expand ? 'Less' : 'More'} details
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
                  <p className="dark:text-status-error py-2 px-4 overflow-auto text-p7">
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
