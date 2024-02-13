import { capitalize, isNil, upperCase } from 'lodash-es';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInterval } from 'react-use';
import {
  Button,
  Combobox,
  ComboboxOption,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  RowSelectionState,
  SortingState,
  Table,
  TableNoDataElement,
} from 'ui-components';

import { ModelExportReport } from '@/api/generated';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { TimesIcon } from '@/components/icons/common/Times';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { TruncatedText } from '@/components/TruncatedText';
import { DURATION } from '@/features/integrations/pages/CreateReport';
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
  const { status } = row;
  const isCompleted = useMemo(() => {
    return status && status.toLowerCase() === 'complete';
  }, [row]);

  return (
    <Dropdown
      triggerAsChild={true}
      align={'start'}
      content={
        <>
          <DropdownItem
            onSelect={() => {
              if (!isCompleted) {
                return;
              }
              onTableAction(row, ActionEnumType.DOWNLOAD);
            }}
            disabled={!isCompleted}
          >
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
  rowSelectionState,
  setRowSelectionState,
  onTableAction,
}: {
  rowSelectionState: RowSelectionState;
  onTableAction: (row: ModelExportReport, actionType: ActionEnumType) => void;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}) => {
  const { data } = useGetReports();
  const [searchParams] = useSearchParams();
  const { message, data: reports } = data || {
    message: '',
    data: [],
  };

  const filteredData = useMemo(() => {
    if (!reports?.length) {
      return [];
    }
    const statusFilter = searchParams.getAll('status');
    const reportTypeFilter = searchParams.getAll('reportType');
    const durationFilter = searchParams.getAll('duration');
    return reports.filter((report) => {
      if (
        statusFilter?.length &&
        !statusFilter.includes(report.status?.toLowerCase() ?? '')
      ) {
        return false;
      }
      if (
        reportTypeFilter?.length &&
        !reportTypeFilter.includes(report.type?.toLowerCase() ?? '')
      ) {
        return false;
      }
      if (
        durationFilter?.length &&
        (!durationFilter.includes(String(report.duration)) || isNil(report.duration))
      ) {
        return false;
      }
      return true;
    });
  }, [searchParams, reports]);

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
      getRowSelectionColumn(columnHelper, {
        minSize: 10,
        size: 15,
        maxSize: 30,
      }),
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
        data={filteredData}
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
        enableRowSelection
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        getRowId={(row) => {
          return JSON.stringify({
            status: row.status,
            id: row.report_id,
          });
        }}
        noDataElement={
          <TableNoDataElement text="No reports found, please add new report" />
        }
      />
    </div>
  );
};

const FILTER_SEARCHPARAMS: Record<string, string> = {
  status: 'Status',
  reportType: 'Report type',
  duration: 'Duration',
};

export const getReportDownloadAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};

export const ReportFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusSearch, setStatusSearch] = useState('');
  const [reportTypeSearch, setReportTypeSearch] = useState('');
  const [durationSearch, setDurationSearch] = useState('');
  const appliedFilterCount = getReportDownloadAppliedFiltersCount(searchParams);

  return (
    <div className="mt-2 px-4 py-2.5 mb-2 border dark:border-bg-hover-3 rounded-[5px] overflow-hidden dark:bg-bg-left-nav">
      <div className="flex gap-2">
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['reportType']}
          multiple
          value={searchParams.getAll('reportType')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('reportType');
              values.forEach((value) => {
                prev.append('reportType', value);
              });
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setReportTypeSearch(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('reportType');
              return prev;
            });
          }}
        >
          {['xlsx', 'pdf']
            .filter((item) => {
              if (!reportTypeSearch.length) return true;
              if (item.includes(reportTypeSearch.toLowerCase())) {
                return true;
              }
              return false;
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {upperCase(item.replace('_', ' '))}
                </ComboboxOption>
              );
            })}
        </Combobox>
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['status']}
          multiple
          value={searchParams.getAll('status')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('status');
              values.forEach((value) => {
                prev.append('status', value);
              });
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setStatusSearch(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('status');
              return prev;
            });
          }}
        >
          {['complete', 'starting', 'in_progress', 'error']
            .filter((item) => {
              if (!statusSearch.length) return true;
              if (item.includes(statusSearch.toLowerCase())) {
                return true;
              }
              return false;
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {capitalize(item.replace('_', ' '))}
                </ComboboxOption>
              );
            })}
        </Combobox>
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['duration']}
          multiple
          value={searchParams.getAll('duration')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('duration');
              values.forEach((value) => {
                prev.append('duration', value);
              });
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setDurationSearch(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('duration');
              return prev;
            });
          }}
        >
          {Object.entries(DURATION)
            .filter(([str]) => {
              if (!durationSearch.length) return true;
              if (str.includes(durationSearch.toLowerCase())) {
                return true;
              }
              return false;
            })
            .map(([str, item]) => {
              return (
                <ComboboxOption key={item} value={String(item)}>
                  {str}
                </ComboboxOption>
              );
            })}
        </Combobox>
      </div>
      {appliedFilterCount > 0 ? (
        <div className="flex gap-2.5 mt-4 flex-wrap items-center">
          {Array.from(searchParams)
            .filter(([key]) => {
              return Object.keys(FILTER_SEARCHPARAMS).includes(key);
            })
            .map(([key, value]) => {
              return (
                <FilterBadge
                  key={`${key}-${value}`}
                  onRemove={() => {
                    setSearchParams((prev) => {
                      const existingValues = prev.getAll(key);
                      prev.delete(key);
                      existingValues.forEach((existingValue) => {
                        if (existingValue !== value) prev.append(key, existingValue);
                      });
                      prev.delete('page');
                      return prev;
                    });
                  }}
                  text={`${FILTER_SEARCHPARAMS[key]}: ${value}`}
                />
              );
            })}
          <Button
            variant="flat"
            color="default"
            startIcon={<TimesIcon />}
            onClick={() => {
              setSearchParams((prev) => {
                Object.keys(FILTER_SEARCHPARAMS).forEach((key) => {
                  prev.delete(key);
                });
                prev.delete('page');
                return prev;
              });
            }}
            size="sm"
          >
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
};
