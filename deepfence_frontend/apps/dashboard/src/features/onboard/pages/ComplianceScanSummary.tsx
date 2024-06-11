import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { createColumnHelper, Table, TableSkeleton } from 'ui-components';

import {
  ModelCloudComplianceStatusEnum,
  ModelComplianceStatusEnum,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { TruncatedText } from '@/components/TruncatedText';
import { getPostureColor } from '@/constants/charts';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import { ScanTypeEnum } from '@/types/common';
import { getPostureStatusPrettyName } from '@/utils/enum';

const DEFAULT_PAGE_SIZE = 10;

const useGetScanSummary = () => {
  const params = useParams();
  if (params?.scanType === ScanTypeEnum.CloudComplianceScan) {
    return useSuspenseQuery({
      ...queries.onboard.cloudComplianceScanSummary({
        bulkScanId: params.bulkScanId ?? '',
      }),
    });
  } else {
    return useSuspenseQuery({
      ...queries.onboard.complianceScanSummary({
        bulkScanId: params.bulkScanId ?? '',
      }),
    });
  }
};
export const useTableColumn = () => {
  const { mode } = useTheme();
  const { scanType, nodeType } = useParams() as {
    scanType: string;
    nodeType: string;
  };

  const { data } = useGetScanSummary();

  if (!scanType) {
    throw new Error('Scan Type is required');
  }
  const columnHelper = createColumnHelper<(typeof data)[number]>();

  const _columns = [
    columnHelper.accessor(ModelCloudComplianceStatusEnum.Alarm, {
      cell: (info) => {
        return (
          <div className="flex items-center gap-x-2 tabular-nums">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor:
                  getPostureColor(mode)[ModelCloudComplianceStatusEnum.Alarm],
              }}
            ></div>
            <span>{info.getValue() ?? 0}</span>
          </div>
        );
      },
      header: () => <TruncatedText text="Alarm" />,
      minSize: 80,
      size: 80,
      maxSize: 80,
      enableResizing: false,
    }),
    columnHelper.accessor(ModelCloudComplianceStatusEnum.Info, {
      cell: (info) => {
        return (
          <div className="flex items-center gap-x-2 tabular-nums">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor:
                  getPostureColor(mode)[ModelCloudComplianceStatusEnum.Info],
              }}
            ></div>
            <span>{info.getValue() ?? 0}</span>
          </div>
        );
      },
      header: () => <TruncatedText text="Info" />,
      minSize: 80,
      size: 80,
      maxSize: 80,
      enableResizing: false,
    }),
    columnHelper.accessor(ModelCloudComplianceStatusEnum.Ok, {
      cell: (info) => {
        return (
          <div className="flex items-center gap-x-2 tabular-nums">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: getPostureColor(mode)[ModelCloudComplianceStatusEnum.Ok],
              }}
            ></div>
            <span>{info.getValue() ?? 0}</span>
          </div>
        );
      },
      header: () => <TruncatedText text="Ok" />,
      minSize: 80,
      size: 80,
      maxSize: 80,
      enableResizing: false,
    }),
    columnHelper.accessor(ModelCloudComplianceStatusEnum.Skip, {
      cell: (info) => {
        return (
          <div className="flex items-center gap-x-2 tabular-nums">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor:
                  getPostureColor(mode)[ModelCloudComplianceStatusEnum.Skip],
              }}
            ></div>
            <span>{info.getValue() ?? 0}</span>
          </div>
        );
      },
      header: () => <TruncatedText text="Skip" />,
      minSize: 80,
      size: 80,
      maxSize: 80,
      enableResizing: false,
    }),
    columnHelper.accessor(ModelCloudComplianceStatusEnum.Delete, {
      cell: (info) => {
        return (
          <div className="flex items-center gap-x-2 tabular-nums">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor:
                  getPostureColor(mode)[ModelCloudComplianceStatusEnum.Delete],
              }}
            ></div>
            <span>{info.getValue() ?? 0}</span>
          </div>
        );
      },
      header: () => <TruncatedText text="Delete" />,
      minSize: 80,
      size: 80,
      maxSize: 80,
      enableResizing: false,
    }),
  ];

  const getDynamicTableColumns = () => {
    if (ScanTypeEnum.CloudComplianceScan === scanType) {
      return _columns;
    } else if (ScanTypeEnum.ComplianceScan === scanType) {
      if (nodeType === 'cluster') {
        return _columns;
      } else if (nodeType === 'host') {
        return [
          columnHelper.accessor(ModelComplianceStatusEnum.Info, {
            cell: (info) => {
              return (
                <div className="flex items-center gap-x-2 tabular-nums">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        getPostureColor(mode)[ModelComplianceStatusEnum.Info],
                    }}
                  ></div>
                  <span>{info.getValue() ?? 0}</span>
                </div>
              );
            },
            header: () => (
              <TruncatedText
                text={getPostureStatusPrettyName(ModelComplianceStatusEnum.Info)}
              />
            ),
            minSize: 80,
            size: 80,
            maxSize: 80,
            enableResizing: false,
          }),
          columnHelper.accessor(ModelComplianceStatusEnum.Pass, {
            cell: (info) => {
              return (
                <div className="flex items-center gap-x-2 tabular-nums">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        getPostureColor(mode)[ModelComplianceStatusEnum.Pass],
                    }}
                  ></div>
                  <span>{info.getValue() ?? 0}</span>
                </div>
              );
            },
            header: () => (
              <TruncatedText
                text={getPostureStatusPrettyName(ModelComplianceStatusEnum.Pass)}
              />
            ),
            minSize: 80,
            size: 80,
            maxSize: 80,
            enableResizing: false,
          }),
          columnHelper.accessor(ModelComplianceStatusEnum.Warn, {
            cell: (info) => {
              return (
                <div className="flex items-center gap-x-2 tabular-nums">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        getPostureColor(mode)[ModelComplianceStatusEnum.Warn],
                    }}
                  ></div>
                  <span>{info.getValue() ?? 0}</span>
                </div>
              );
            },
            header: () => (
              <TruncatedText
                text={getPostureStatusPrettyName(ModelComplianceStatusEnum.Warn)}
              />
            ),
            minSize: 80,
            size: 80,
            maxSize: 80,
            enableResizing: false,
          }),
          columnHelper.accessor(ModelComplianceStatusEnum.Note, {
            cell: (info) => {
              return (
                <div className="flex items-center gap-x-2 tabular-nums">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        getPostureColor(mode)[ModelComplianceStatusEnum.Note],
                    }}
                  ></div>
                  <span>{info.getValue() ?? 0}</span>
                </div>
              );
            },
            header: () => (
              <TruncatedText
                text={getPostureStatusPrettyName(ModelComplianceStatusEnum.Note)}
              />
            ),
            minSize: 80,
            size: 80,
            maxSize: 80,
            enableResizing: false,
          }),
        ];
      }
    }
    return [];
  };

  const columns = useMemo(() => {
    const columns = getDynamicTableColumns();
    return columns;
  }, []);
  return columns;
};

const SummaryTable = () => {
  const { data } = useGetScanSummary();
  const dynamicColumns = useTableColumn();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const columnHelper = createColumnHelper<(typeof data)[number]>();

  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('accountType', {
        cell: (info) => <TruncatedText text={info.getValue()} />,
        header: () => 'Type',
        minSize: 50,
        size: 60,
        maxSize: 60,
      }),
      columnHelper.accessor('accountName', {
        cell: (info) => <TruncatedText text={info.getValue()} />,
        header: () => 'Name',
        minSize: 100,
        size: 120,
        maxSize: 250,
      }),
      columnHelper.accessor('benchmarkType', {
        cell: (info) => <TruncatedText text={info.getValue()?.toUpperCase()} />,
        header: () => 'Benchmark',
        minSize: 100,
        size: 120,
        maxSize: 250,
      }),
      columnHelper.accessor('total', {
        cell: (info) => (
          <div className="flex items-center justify-end tabular-nums">
            <span className="truncate">{info.getValue()}</span>
          </div>
        ),
        header: () => (
          <div className="text-right">
            <TruncatedText text="Total" />
          </div>
        ),
        minSize: 80,
        size: 80,
        maxSize: 80,
      }),
      ...dynamicColumns,
    ];

    return columns;
  }, []);

  return (
    <Table
      size="default"
      data={data ?? []}
      columns={columns}
      enableColumnResizing
      enableSorting
      enablePageResize
      pageSize={pageSize}
      enablePagination
      onPageResize={(newSize) => {
        setPageSize(newSize);
      }}
    />
  );
};
const ComplianceScanSummary = () => {
  return (
    <div className="flex flex-col">
      <ConnectorHeader
        title={'Posture Scan Result Summary'}
        description={'Summary of posture scan result'}
      />

      <DFLink to={'/posture'} unstyled>
        <div className="dark:text-accent-accent text-text-link hover:text-bg-hover-1 text-p4">
          Go to Posture dashboard to view detailed scan results
        </div>
      </DFLink>

      <div className="flex flex-col gap-4 mt-4">
        <Suspense
          fallback={
            <div className="w-full">
              <TableSkeleton columns={8} rows={DEFAULT_PAGE_SIZE} />
            </div>
          }
        >
          <SummaryTable />
        </Suspense>
      </div>
    </div>
  );
};

export const module = {
  element: <ComplianceScanSummary />,
};
