import { upperFirst } from 'lodash-es';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { useFetcher, useSearchParams } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import {
  Badge,
  Button,
  createColumnHelper,
  getRowSelectionColumn,
  RowSelectionState,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { ModelCloudCompliance } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { FilterIcon } from '@/components/icons/common/Filter';
import { PostureStatusBadgeIcon } from '@/components/SeverityBadge';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { TruncatedText } from '@/components/TruncatedText';
import { ActionData } from '@/features/postures/components/scan-result/cloud/action';
import { BulkActions } from '@/features/postures/components/scan-result/cloud/BulkActions';
import { ActionDropdown } from '@/features/postures/components/scan-result/cloud/Dropdowns';
import {
  Filters,
  getAppliedFiltersCount,
} from '@/features/postures/components/scan-result/cloud/Filters';
import {
  DEFAULT_PAGE_SIZE,
  useScanResults,
  useScanStatus,
} from '@/features/postures/components/scan-result/cloud/hooks';
import { DeleteConfirmationModal } from '@/features/postures/components/scan-result/cloud/Modals';
import { TablePlaceholder } from '@/features/postures/components/scan-result/cloud/TablePlaceholder';
import {
  isAlarmStatus,
  isDeleteStatus,
  isInfoStatus,
  isNoteStatus,
  isOkStatus,
  isPassStatus,
  isSkipStatus,
  isWarnStatus,
} from '@/features/postures/utils';
import { useTheme } from '@/theme/ThemeContext';
import { PostureSeverityType } from '@/types/common';
import { getBenchmarkPrettyName } from '@/utils/enum';
import { isScanComplete } from '@/utils/scan';
import { useSortingState } from '@/utils/table';

export const CloudPostureResults = () => {
  const [searchParams] = useSearchParams();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const fetcher = useFetcher<ActionData>();

  const onTableAction = useCallback(
    (ids: string[], actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);

      ids.forEach((item) => formData.append('nodeIds[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [fetcher],
  );

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelectionState);
  }, [rowSelectionState]);

  return (
    <div className="self-start">
      <div className="h-12 flex items-center">
        <BulkActions
          ids={selectedIds}
          onTableAction={onTableAction}
          setIdsToDelete={setIdsToDelete}
          setShowDeleteDialog={setShowDeleteDialog}
        />
        <div className="pr-2 ml-auto flex items-center gap-1">
          <Button
            className="pr-0"
            color="default"
            variant="flat"
            size="sm"
            startIcon={<FilterIcon />}
            onClick={() => {
              setFiltersExpanded((prev) => !prev);
            }}
            data-testid="filterButtonIdForTable"
          >
            Filter
          </Button>
          {getAppliedFiltersCount(searchParams) > 0 ? (
            <Badge
              label={String(getAppliedFiltersCount(searchParams))}
              variant="filled"
              size="small"
              color="blue"
            />
          ) : null}
        </div>
      </div>
      {filtersExpanded ? <Filters /> : null}
      <Suspense fallback={<TableSkeleton columns={7} rows={10} />}>
        <CloudPostureTable
          onTableAction={onTableAction}
          setShowDeleteDialog={setShowDeleteDialog}
          setIdsToDelete={setIdsToDelete}
          rowSelectionState={rowSelectionState}
          setRowSelectionState={setRowSelectionState}
        />
      </Suspense>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          ids={idsToDelete}
          setShowDialog={setShowDeleteDialog}
          onDeleteSuccess={() => {
            setRowSelectionState({});
          }}
        />
      )}
    </div>
  );
};

const CloudPostureTable = ({
  onTableAction,
  setIdsToDelete,
  setShowDeleteDialog,
  rowSelectionState,
  setRowSelectionState,
}: {
  onTableAction: (ids: string[], actionType: string) => void;
  setIdsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  rowSelectionState: RowSelectionState;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}) => {
  const { mode } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: statusResultData } = useScanStatus();
  const { data: scanResultData } = useScanResults({
    enabled: isScanComplete(statusResultData.status),
  });
  const columnHelper = createColumnHelper<ModelCloudCompliance>();
  const [sort, setSort] = useSortingState();

  const columns = useMemo(() => {
    const columns = [
      getRowSelectionColumn(columnHelper, {
        minSize: 25,
        size: 25,
        maxSize: 25,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => (
          <ActionDropdown
            ids={[cell.row.original.node_id]}
            setIdsToDelete={setIdsToDelete}
            setShowDeleteDialog={setShowDeleteDialog}
            onTableAction={onTableAction}
            trigger={
              <button className="p-1">
                <div className="h-[16px] w-[16px] text-text-text-and-icon rotate-90">
                  <EllipsisIcon />
                </div>
              </button>
            }
          />
        ),
        header: () => '',
        size: 25,
        minSize: 25,
        maxSize: 25,
        enableResizing: false,
      }),
      columnHelper.accessor('node_id', {
        id: 'control_id',
        enableSorting: true,
        enableResizing: false,
        cell: (info) => {
          return (
            <DFLink
              to={{
                pathname: `./${encodeURIComponent(info.row.original.node_id)}`,
                search: searchParams.toString(),
              }}
              className="flex items-center gap-x-[6px]"
            >
              <div className="w-4 h-4 text-text-text-and-icon">
                <PostureIcon />
              </div>
              <TruncatedText
                text={info.row.original.control_id ?? info.row.original.node_id}
              />
            </DFLink>
          );
        },
        header: () => 'ID',
        minSize: 80,
        size: 100,
        maxSize: 120,
      }),
      columnHelper.accessor('compliance_check_type', {
        enableSorting: true,
        enableResizing: false,
        cell: (info) => <TruncatedText text={getBenchmarkPrettyName(info.getValue())} />,
        header: () => 'Benchmark type',
        minSize: 40,
        size: 50,
        maxSize: 60,
      }),
      columnHelper.accessor('service', {
        enableSorting: true,
        enableResizing: false,
        cell: (info) => <TruncatedText text={info.getValue()} />,
        header: () => 'Service',
        minSize: 40,
        size: 50,
        maxSize: 60,
      }),
      columnHelper.accessor('status', {
        enableResizing: false,
        minSize: 40,
        size: 50,
        maxSize: 65,
        header: () => <div>Status</div>,
        cell: (info) => {
          return (
            <div className="flex items-center gap-x-2">
              <PostureStatusBadgeIcon
                status={info.getValue() as PostureSeverityType}
                theme={mode}
              />
              {upperFirst(info.getValue())}
            </div>
          );
        },
      }),
      columnHelper.accessor('reason', {
        enableResizing: false,
        minSize: 60,
        size: 100,
        maxSize: 130,
        header: () => <div>Reason</div>,
        cell: (info) => {
          return <TruncatedText text={info.getValue()} />;
        },
      }),
      columnHelper.accessor('description', {
        enableResizing: false,
        enableSorting: false,
        minSize: 140,
        size: 150,
        maxSize: 160,
        header: () => 'Description',
        cell: (info) => (
          <TruncatedText text={info.getValue() || 'No description available'} />
        ),
      }),
    ];

    return columns;
  }, [setSearchParams, mode]);

  return (
    <Table
      size="default"
      data={
        isScanComplete(statusResultData.status)
          ? scanResultData?.data?.compliances ?? []
          : []
      }
      columns={columns}
      enableRowSelection
      rowSelectionState={rowSelectionState}
      onRowSelectionChange={setRowSelectionState}
      enablePagination
      manualPagination
      approximatePagination
      enableColumnResizing
      totalRows={scanResultData?.data?.pagination?.totalRows}
      pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
      pageIndex={scanResultData?.data?.pagination?.currentPage}
      enableSorting
      manualSorting
      sortingState={sort}
      getRowId={(row) => {
        return row.node_id;
      }}
      onPaginationChange={(updaterOrValue) => {
        let newPageIndex = 0;
        if (typeof updaterOrValue === 'function') {
          newPageIndex = updaterOrValue({
            pageIndex: scanResultData?.data?.pagination.currentPage ?? 0,
            pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
          }).pageIndex;
        } else {
          newPageIndex = updaterOrValue.pageIndex;
        }
        setSearchParams((prev) => {
          prev.set('page', String(newPageIndex));
          return prev;
        });
      }}
      onSortingChange={(updaterOrValue) => {
        let newSortState: SortingState = [];
        if (typeof updaterOrValue === 'function') {
          newSortState = updaterOrValue(sort);
        } else {
          newSortState = updaterOrValue;
        }
        setSearchParams((prev) => {
          if (!newSortState.length) {
            prev.delete('sortby');
            prev.delete('desc');
          } else {
            prev.set('sortby', String(newSortState[0].id));
            prev.set('desc', String(newSortState[0].desc));
          }
          return prev;
        });
        setSort(newSortState);
      }}
      getTrProps={(row) => {
        if (row.original.masked) {
          return {
            className: 'opacity-40',
          };
        }
        return {};
      }}
      enablePageResize
      onPageResize={(newSize) => {
        setSearchParams((prev) => {
          prev.set('size', String(newSize));
          prev.delete('page');
          return prev;
        });
      }}
      noDataElement={
        <TablePlaceholder
          scanStatus={statusResultData?.status ?? ''}
          message={statusResultData?.status_message ?? ''}
        />
      }
      getTdProps={(cell) => {
        const status = cell.row.original.status;
        return {
          className: cn(
            'relative',
            'first:before:content-[""]',
            'first:before:absolute',
            'first:before:h-full',
            'first:before:w-1',
            'first:before:left-0',
            'first:before:top-px',
            {
              'first:before:bg-status-error': isAlarmStatus(status),
              'first:before:bg-status-info': isInfoStatus(status),
              'first:before:bg-status-success':
                isOkStatus(status) || isPassStatus(status),
              'first:before:bg-severity-unknown':
                isSkipStatus(status) || isNoteStatus(status),
              'first:before:bg-status-warning': isWarnStatus(status),
              'first:before:bg-btn-red': isDeleteStatus(status),
            },
          ),
        };
      }}
    />
  );
};
