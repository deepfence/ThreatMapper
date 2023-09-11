import { useMemo, useState } from 'react';
import { useInterval } from 'react-use';
import {
  createColumnHelper,
  Dropdown,
  DropdownItem,
  SortingState,
  Table,
  TableNoDataElement,
} from 'ui-components';

import { ModelExportReport } from '@/api/generated';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { TruncatedText } from '@/components/TruncatedText';
import { useGetReports } from '@/features/integrations/pages/DownloadReport';
import { invalidateAllQueries } from '@/queries';
import { formatMilliseconds } from '@/utils/date';

enum ActionEnumType {
  DELETE = 'delete',
  DOWNLOAD = 'download',
}

const DEFAULT_PAGE_SIZE = 10;

const ActionDropdown = ({
  row,
  trigger,
  onTableAction,
}: {
  row: ModelExportReport;
  trigger: React.ReactNode;
  onTableAction: (row: ModelExportReport, actionType: ActionEnumType) => void;
}) => {
  return (
    <Dropdown
      triggerAsChild={true}
      align={'start'}
      content={
        <>
          <DropdownItem onClick={() => onTableAction(row, ActionEnumType.DOWNLOAD)}>
            Download report
          </DropdownItem>
          <DropdownItem
            onClick={() => onTableAction(row, ActionEnumType.DELETE)}
            className="dark:text-status-error dark:hover:text-[#C45268]"
          >
            Delete
          </DropdownItem>
        </>
      }
    >
      {trigger}
    </Dropdown>
  );
};

export const ReportTable = ({
  onTableAction,
}: {
  onTableAction: (row: ModelExportReport, actionType: ActionEnumType) => void;
}) => {
  const { data } = useGetReports();
  const { message, data: reports } = data || {
    message: '',
    data: [],
  };

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [sort, setSort] = useState<SortingState>([
    {
      id: 'created_at',
      desc: true,
    },
  ]);

  useInterval(() => {
    invalidateAllQueries();
  }, 15000);

  const columnHelper = createColumnHelper<ModelExportReport>();
  const columns = useMemo(() => {
    const columns = [
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          if (!cell.row.original.report_id) {
            throw new Error('Registry Account node id not found');
          }
          return (
            <ActionDropdown
              row={cell.row.original}
              onTableAction={onTableAction}
              trigger={
                <button className="p-1">
                  <div className="h-[16px] w-[16px] dark:text-text-text-and-icon rotate-90">
                    <EllipsisIcon />
                  </div>
                </button>
              }
            />
          );
        },
        header: () => '',
        minSize: 20,
        size: 20,
        maxSize: 20,
        enableResizing: false,
      }),
      columnHelper.accessor('type', {
        enableSorting: true,
        cell: (cell) => <span className="uppercase">{cell.getValue()}</span>,
        header: () => 'Report Type',
        minSize: 40,
        size: 50,
        maxSize: 55,
      }),
      columnHelper.accessor('created_at', {
        enableSorting: true,
        cell: (cell) => formatMilliseconds(cell.getValue() ?? ''),
        header: () => 'Created At',
        minSize: 65,
        size: 65,
        maxSize: 70,
      }),
      columnHelper.accessor('duration', {
        enableSorting: true,
        cell: (cell) => {
          const duration = cell.getValue();
          if (duration === 1) {
            return 'Last 1 day';
          } else if (duration === 0) {
            return 'All documents';
          } else {
            return `Last ${duration} days`;
          }
        },
        header: () => 'Duration',
        minSize: 50,
        size: 55,
        maxSize: 60,
      }),
      columnHelper.accessor('status', {
        enableSorting: true,
        cell: (cell) => <ScanStatusBadge status={cell.getValue() ?? ''} />,
        header: () => 'Status',
        minSize: 60,
        size: 65,
        maxSize: 70,
      }),
      columnHelper.accessor('filters', {
        enableSorting: false,
        cell: (cell) => <TruncatedText text={cell.getValue() ?? ''} />,
        header: () => 'Filters',
        minSize: 75,
        size: 85,
        maxSize: 85,
      }),
    ];
    return columns;
  }, []);

  if (message) {
    return <p className="dark:text-status-error text-p7">{message}</p>;
  }
  return (
    <div className="mt-2">
      <Table
        size="default"
        data={reports ?? []}
        columns={columns}
        enablePagination
        enableSorting
        sortingState={sort}
        onSortingChange={setSort}
        enablePageResize
        pageSize={pageSize}
        onPageResize={(newSize) => {
          setPageSize(newSize);
        }}
        noDataElement={
          <TableNoDataElement text="No reports found, please add new report" />
        }
      />
    </div>
  );
};
