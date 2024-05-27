import { upperFirst } from 'lodash-es';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
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
import { CaretDown } from '@/components/icons/common/CaretDown';
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
  useGetControls,
  usePageParams,
  useScanResultsByControl,
  useScanStatus,
} from '@/features/postures/components/scan-result/cloud/hooks';
import { DeleteConfirmationModal } from '@/features/postures/components/scan-result/cloud/Modals';
import { TablePlaceholder } from '@/features/postures/components/scan-result/cloud/TablePlaceholder';
import {
  GroupedResultsBenchmarkSkeleton,
  GroupedResultsSkeleton,
} from '@/features/postures/components/scan-result/GroupedResultsSkeleton';
import { useTheme } from '@/theme/ThemeContext';
import {
  isAlarmStatus,
  isDeleteStatus,
  isInfoStatus,
  isNoteStatus,
  isOkStatus,
  isPassStatus,
  isSkipStatus,
  isWarnStatus,
  PostureSeverityType,
} from '@/types/common';
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
  const [benchmarkAccordionValue, setBenchmarkAccordionValue] = useState<string>(
    statusData.benchmark_types?.[0] ?? '',
  );

  useEffect(() => {
    setBenchmarkAccordionValue(statusData.benchmark_types?.[0] ?? '');
  }, [statusData.scan_id]);

  if (!isScanComplete(statusData.status)) {
    return (
      <TablePlaceholder
        scanStatus={statusData.status ?? ''}
        message={statusData.status_message ?? ''}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-4 -mt-4">
      {statusData.benchmark_types?.map((checkType) => {
        return (
          <div key={checkType}>
            <button
              type="button"
              className={cn(
                'text-start w-full uppercase text-t4 text-text-text-and-icon py-2',
                {
                  'dark:text-white text-black': benchmarkAccordionValue === checkType,
                },
              )}
              onClick={(e) => {
                e.preventDefault();
                if (benchmarkAccordionValue === checkType) {
                  setBenchmarkAccordionValue('');
                } else {
                  setBenchmarkAccordionValue(checkType);
                }
              }}
            >
              <div className="flex gap-2 items-center">
                <div
                  className={cn('h-4 w-4 shrink-0', {
                    '-rotate-90': benchmarkAccordionValue !== checkType,
                  })}
                >
                  <CaretDown />
                </div>
                <div>{checkType.replace('_', ' ')}</div>
              </div>
            </button>
            {benchmarkAccordionValue === checkType && (
              <Suspense fallback={<GroupedResultsBenchmarkSkeleton />}>
                <CloudPostureResultsGroupedCheckType checkType={checkType} />
              </Suspense>
            )}
          </div>
        );
      })}
    </div>
  );
};

const CloudPostureResultsGroupedCheckType = ({ checkType }: { checkType: string }) => {
  const { nodeType } = usePageParams();
  const controls = useGetControls({ checkType, nodeType });
  const { mode } = useTheme();

  return (
    <Accordion type="single" collapsible>
      {controls[checkType].map((control) => {
        return (
          <AccordionItem
            value={`${checkType}-${control.node_id}`}
            key={control.node_id}
            disabled={control.totalCount === 0}
          >
            <AccordionTrigger>
              <div className="flex">
                <div>
                  {control.category_hierarchy_short ?? ''} - {control.description ?? ''}
                </div>
                <div className="ml-auto flex gap-2 pl-4">
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
            </AccordionTrigger>
            <AccordionContent>
              <PostureTableForControlWrapper controlId={control.control_id ?? ''} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

const PostureTableForControlWrapper = ({ controlId }: { controlId: string }) => {
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
                text={info.row.original.control_id ?? info.row.original.node_id}
              />
            </DFLink>
          );
        },
        header: () => 'ID',
        minSize: 80,
        size: 80,
        maxSize: 90,
      }),
      columnHelper.accessor('compliance_check_type', {
        enableSorting: true,
        enableResizing: false,
        cell: (info) => <TruncatedText text={info.getValue().toUpperCase()} />,
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
        minSize: 60,
        size: 60,
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
        size: 70,
        maxSize: 80,
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
