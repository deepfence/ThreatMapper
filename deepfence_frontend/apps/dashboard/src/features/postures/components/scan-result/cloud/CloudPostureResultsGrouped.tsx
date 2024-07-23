import { upperFirst } from 'lodash-es';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { useFetcher, useSearchParams } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  createColumnHelper,
  getRowSelectionColumn,
  RowSelectionState,
  SortingState,
  Table,
  TableNoDataElement,
  TableSkeleton,
} from 'ui-components';

import { ModelCloudCompliance } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
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
  useGetControls,
  useScanResultsByControl,
  useScanStatus,
} from '@/features/postures/components/scan-result/cloud/hooks';
import { DeleteConfirmationModal } from '@/features/postures/components/scan-result/cloud/Modals';
import { TablePlaceholder } from '@/features/postures/components/scan-result/cloud/TablePlaceholder';
import {
  GroupedResultsBenchmarkSkeleton,
  GroupedResultsSkeleton,
} from '@/features/postures/components/scan-result/GroupedResultsSkeleton';
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
import { abbreviateNumber } from '@/utils/number';
import { isScanComplete } from '@/utils/scan';

export const CloudPostureResultsGrouped = () => {
  const [searchParams] = useSearchParams();
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  return (
    <div className="self-start">
      <div className="h-12 flex items-center">
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
      <Suspense fallback={<GroupedResultsSkeleton />}>
        <CloudPostureResultsGroupedCheckTypeList />
      </Suspense>
    </div>
  );
};

const CloudPostureResultsGroupedCheckTypeList = () => {
  const { data: statusData } = useScanStatus();

  return (
    <div className="flex flex-col gap-4 pb-4 -mt-4">
      <Suspense
        fallback={
          <div className="mt-4">
            <GroupedResultsBenchmarkSkeleton />
          </div>
        }
      >
        <div className="mt-4">
          {!isScanComplete(statusData.status) ? (
            <TablePlaceholder
              scanStatus={statusData.status ?? ''}
              message={statusData.status_message ?? ''}
            />
          ) : (
            <CloudPostureResultsGroupedCheckType />
          )}
        </div>
      </Suspense>
    </div>
  );
};

const CloudPostureResultsGroupedCheckType = () => {
  const controls = useGetControls();
  const { mode } = useTheme();

  if (!controls || controls.length === 0) {
    return (
      <div className="flex items-center justify-center gap-x-2 text-text-text-and-icon min-h-[384px]">
        <div className="h-6 w-6 shrink-0">
          <ErrorStandardLineIcon />
        </div>
        <div className="text-h3">No data available</div>
      </div>
    );
  }

  return (
    <Accordion
      type="single"
      collapsible
      data-testid="cloudPostureResultsGroupedCheckTypeId"
    >
      {controls.map((control) => {
        return (
          <AccordionItem
            value={control.controlId}
            key={control.controlId}
            disabled={control.totalCount === 0}
          >
            <AccordionTrigger disabled={control.totalCount === 0}>
              <div className="flex">
                <div>{control.title}</div>
                <div className="ml-auto pl-4 flex gap-4 items-center">
                  <div className="flex gap-2 items-center min-w-[300px]">
                    {control.benchmarkTypes.map((benchmark) => {
                      return (
                        <Badge
                          label={benchmark.replaceAll('_', ' ').toUpperCase()}
                          key={benchmark}
                        />
                      );
                    })}
                  </div>
                  <div className="flex gap-2 items-center min-w-[200px] justify-end">
                    {Object.keys(control.counts).map((key) => {
                      return (
                        <div key={key} className="flex items-center gap-x-1">
                          <PostureStatusBadgeIcon
                            theme={mode}
                            status={key.toLowerCase() as PostureSeverityType}
                          />
                          <span className="text-p3 text-text-input-value">
                            {abbreviateNumber(control.counts[key])}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <PostureTableForControlWrapper controlId={control.controlId ?? ''} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

const PostureTableForControlWrapper = ({ controlId }: { controlId: string }) => {
  controlId = controlId.split('.').slice(1).join('.');
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
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
    <div className="px-4 pb-4 pt-1">
      <div className="h-12 flex items-center">
        <BulkActions
          ids={selectedIds}
          onTableAction={onTableAction}
          setIdsToDelete={setIdsToDelete}
          setShowDeleteDialog={setShowDeleteDialog}
        />
      </div>
      <Suspense fallback={<TableSkeleton columns={7} rows={10} />}>
        <PostureTableForControl
          onTableAction={onTableAction}
          setIdsToDelete={setIdsToDelete}
          setShowDeleteDialog={setShowDeleteDialog}
          rowSelectionState={rowSelectionState}
          setRowSelectionState={setRowSelectionState}
          controlId={controlId}
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

const PostureTableForControl = ({
  onTableAction,
  setIdsToDelete,
  setShowDeleteDialog,
  rowSelectionState,
  setRowSelectionState,
  controlId,
}: {
  onTableAction: (ids: string[], actionType: string) => void;
  setIdsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  rowSelectionState: RowSelectionState;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  controlId: string;
}) => {
  const { mode } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const columnHelper = createColumnHelper<ModelCloudCompliance>();
  const [pageNo, setPageNo] = useState(0);
  const [sort, setSort] = useState<SortingState>([]);

  const { data } = useScanResultsByControl({
    controlId,
    order: sort,
    page: pageNo,
  });
  const { data: scanResultData } = data;

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
                text={info.row.original.reason ?? info.row.original.control_id}
              />
            </DFLink>
          );
        },
        header: () => 'ID',
        minSize: 120,
        size: 400,
        maxSize: 600,
      }),
      columnHelper.accessor('service', {
        enableSorting: true,
        enableResizing: false,
        cell: (info) => <TruncatedText text={info.getValue()} />,
        header: () => 'Service',
        minSize: 40,
        size: 100,
        maxSize: 120,
      }),
      columnHelper.accessor('status', {
        enableResizing: false,
        minSize: 40,
        size: 80,
        maxSize: 130,
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
    ];

    return columns;
  }, [setSearchParams, mode]);
  return (
    <Table
      size="default"
      data={scanResultData?.compliances ?? []}
      columns={columns}
      enableRowSelection
      rowSelectionState={rowSelectionState}
      onRowSelectionChange={setRowSelectionState}
      enablePagination
      manualPagination
      approximatePagination
      enableColumnResizing
      totalRows={scanResultData?.pagination?.totalRows}
      pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
      pageIndex={scanResultData?.pagination?.currentPage}
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
            pageIndex: scanResultData?.pagination.currentPage ?? 0,
            pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
          }).pageIndex;
        } else {
          newPageIndex = updaterOrValue.pageIndex;
        }
        setPageNo(newPageIndex);
      }}
      onSortingChange={(updaterOrValue) => {
        let newSortState: SortingState = [];
        if (typeof updaterOrValue === 'function') {
          newSortState = updaterOrValue(sort);
        } else {
          newSortState = updaterOrValue;
        }
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
          return prev;
        });
        setPageNo(0);
      }}
      noDataElement={<TableNoDataElement text="No data available" />}
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
