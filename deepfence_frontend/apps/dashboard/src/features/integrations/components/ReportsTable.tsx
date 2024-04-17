import {
  capitalize,
  intersection,
  isEmpty,
  isNil,
  upperCase,
  upperFirst,
} from 'lodash-es';
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

import {
  ModelExportReport,
  UtilsReportFilters,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableContainerList } from '@/components/forms/SearchableContainerList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { SearchableImageList } from '@/components/forms/SearchableImageList';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { TimesIcon } from '@/components/icons/common/Times';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { TruncatedText } from '@/components/TruncatedText';
import { RESOURCES } from '@/features/integrations/pages/CreateReport';
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

  const isError = useMemo(() => {
    return status && status.toLowerCase() === 'error';
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
            onSelect={() => onTableAction(row, ActionEnumType.DELETE)}
            color="error"
            disabled={!isCompleted && !isError}
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
    const scanTypeFilter = searchParams.getAll('scanType');
    const nodeTypeFilter = searchParams.getAll('nodeType');
    const containerFilter = searchParams.getAll('container');
    const hostFilter = searchParams.getAll('host');
    const containerImageFilter = searchParams.getAll('containerImage');
    const clusterFilter = searchParams.getAll('cluster');

    return reports.filter((report) => {
      const filters = JSON.parse(report.filters ?? '') as UtilsReportFilters;
      const advancedFilters = filters?.advanced_report_filters ?? {};
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
      // filter from filters json
      if (
        scanTypeFilter?.length &&
        (!scanTypeFilter.includes(filters?.scan_type) || isNil(filters?.scan_type))
      ) {
        return false;
      }
      if (
        nodeTypeFilter?.length &&
        (!nodeTypeFilter.includes(filters?.node_type) || isNil(filters?.node_type))
      ) {
        return false;
      }
      if (
        containerFilter?.length &&
        (intersection(containerFilter, advancedFilters?.container_name).length === 0 ||
          isNil(advancedFilters?.container_name) ||
          isEmpty(advancedFilters?.container_name))
      ) {
        return false;
      }
      if (
        hostFilter?.length &&
        (intersection(hostFilter, advancedFilters?.host_name).length === 0 ||
          isNil(advancedFilters?.host_name) ||
          isEmpty(advancedFilters?.host_name))
      ) {
        return false;
      }
      if (
        containerImageFilter?.length &&
        (intersection(containerImageFilter, advancedFilters?.image_name).length === 0 ||
          isNil(advancedFilters?.image_name) ||
          isEmpty(advancedFilters?.image_name))
      ) {
        return false;
      }
      if (
        clusterFilter?.length &&
        (intersection(clusterFilter, advancedFilters?.kubernetes_cluster_name).length ===
          0 ||
          isNil(advancedFilters?.kubernetes_cluster_name) ||
          isEmpty(advancedFilters?.kubernetes_cluster_name))
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
        minSize: 15,
        size: 20,
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
                  <div className="h-[16px] w-[16px] text-text-text-and-icon rotate-90">
                    <EllipsisIcon />
                  </div>
                </button>
              }
            />
          );
        },
        header: () => '',
        minSize: 20,
        size: 25,
        maxSize: 30,
        enableResizing: false,
      }),
      columnHelper.accessor('type', {
        enableSorting: true,
        cell: (cell) => <span className="uppercase">{cell.getValue()}</span>,
        header: () => 'Report Type',
        minSize: 30,
        size: 40,
        maxSize: 55,
      }),
      columnHelper.accessor('created_at', {
        enableSorting: true,
        cell: (cell) => formatMilliseconds(cell.getValue() ?? ''),
        header: () => 'Created At',
        minSize: 40,
        size: 50,
        maxSize: 70,
      }),
      columnHelper.display({
        id: 'duration',
        cell: (cell) => {
          const fromTimestamp = cell.row.original.from_timestamp;
          const toTimestamp = cell.row.original.to_timestamp;
          if (!fromTimestamp || !toTimestamp) {
            return 'All documents';
          }
          return `${formatMilliseconds(fromTimestamp)} - ${formatMilliseconds(
            toTimestamp,
          )}`;
        },
        header: () => 'Duration',
        minSize: 50,
        size: 70,
        maxSize: 80,
      }),
      columnHelper.accessor('status', {
        enableSorting: true,
        cell: (cell) => <ScanStatusBadge status={cell.getValue() ?? ''} />,
        header: () => 'Status',
        minSize: 30,
        size: 40,
        maxSize: 70,
      }),
      columnHelper.accessor('filters', {
        enableSorting: false,
        cell: (cell) => <TruncatedText text={cell.getValue() ?? ''} />,
        header: () => 'Filters',
        minSize: 75,
        size: 140,
        maxSize: 150,
      }),
    ];
    return columns;
  }, []);

  if (message) {
    return <p className="text-status-error text-p7">{message}</p>;
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
        enableColumnResizing
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
enum FILTER_SEARCHPARAMS_KEYS_ENUM {
  container = 'container',
  host = 'host',
  containerImage = 'containerImage',
  cluster = 'cluster',
}
const FILTER_SEARCHPARAMS_DYNAMIC_KEYS = [
  FILTER_SEARCHPARAMS_KEYS_ENUM.container,
  FILTER_SEARCHPARAMS_KEYS_ENUM.host,
  FILTER_SEARCHPARAMS_KEYS_ENUM.containerImage,
  FILTER_SEARCHPARAMS_KEYS_ENUM.cluster,
];
const FILTER_SEARCHPARAMS: Record<string, string> = {
  status: 'Status',
  reportType: 'Report type',
  scanType: 'Scan type',
  nodeType: 'Node type',
  container: 'Container',
  host: 'Host',
  containerImage: 'Container image',
  cluster: 'Cluster',
};

export const getReportDownloadAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};

const getResourceDisplayValue = (resource: string) => {
  if (resource === UtilsReportFiltersScanTypeEnum.CloudCompliance) {
    return 'Cloud Compliance';
  } else if (resource === UtilsReportFiltersNodeTypeEnum.ContainerImage) {
    return 'Container image';
  }
  return resource;
};

export const ReportFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusSearch, setStatusSearch] = useState('');
  const [reportTypeSearch, setReportTypeSearch] = useState('');
  const [scanTypeSearch, setScanTypeSearch] = useState('');
  const [nodeTypeSearch, setNodeTypeSearch] = useState('');
  const appliedFilterCount = getReportDownloadAppliedFiltersCount(searchParams);

  const onFilterRemove = ({ key, value }: { key: string; value: string }) => {
    return () => {
      setSearchParams((prev) => {
        const existingValues = prev.getAll(key);
        prev.delete(key);
        existingValues.forEach((existingValue) => {
          if (existingValue !== value) prev.append(key, existingValue);
        });
        prev.delete('page');
        return prev;
      });
    };
  };

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
          {['xlsx', 'pdf', 'sbom']
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
          getDisplayValue={() => FILTER_SEARCHPARAMS['scanType']}
          multiple
          value={searchParams.getAll('scanType')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('scanType');
              values.forEach((value) => {
                prev.append('scanType', value);
              });
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setScanTypeSearch(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('scanType');
              return prev;
            });
          }}
        >
          {RESOURCES.filter((resource) => {
            if (!scanTypeSearch.length) return true;
            if (resource.includes(scanTypeSearch.toLowerCase())) {
              return true;
            }
            return false;
          }).map((resource, item) => {
            return (
              <ComboboxOption key={item} value={resource}>
                {upperFirst(getResourceDisplayValue(resource))}
              </ComboboxOption>
            );
          })}
        </Combobox>
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['nodeType']}
          multiple
          value={searchParams.getAll('nodeType')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('nodeType');
              values.forEach((value) => {
                prev.append('nodeType', value);
              });
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setNodeTypeSearch(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('nodeType');
              return prev;
            });
          }}
        >
          {[
            UtilsReportFiltersNodeTypeEnum.Host,
            UtilsReportFiltersNodeTypeEnum.Container,
            UtilsReportFiltersNodeTypeEnum.ContainerImage,
            UtilsReportFiltersNodeTypeEnum.Cluster,
            UtilsReportFiltersNodeTypeEnum.Aws,
            UtilsReportFiltersNodeTypeEnum.Azure,
            UtilsReportFiltersNodeTypeEnum.Gcp,
          ]
            .filter((resource) => {
              if (!nodeTypeSearch.length) return true;
              if (resource.includes(nodeTypeSearch.toLowerCase())) {
                return true;
              }
              return false;
            })
            .map((resource, item) => {
              return (
                <ComboboxOption key={item} value={resource}>
                  {upperFirst(getResourceDisplayValue(resource))}
                </ComboboxOption>
              );
            })}
        </Combobox>
        <SearchableHostList
          scanType={'none'}
          defaultSelectedHosts={searchParams.getAll('host')}
          agentRunning={false}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('host');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('host');
              value.forEach((host) => {
                prev.append('host', host);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
        <SearchableContainerList
          scanType={'none'}
          triggerVariant="button"
          defaultSelectedContainers={searchParams.getAll('container')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('container');
              values.forEach((value) => {
                prev.append('container', value);
              });
              return prev;
            });
          }}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('container');
              return prev;
            });
          }}
        />
        <SearchableImageList
          scanType={'none'}
          defaultSelectedImages={searchParams.getAll('containerImage')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('containerImage');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('containerImage');
              value.forEach((containerImage) => {
                prev.append('containerImage', containerImage);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
        <SearchableClusterList
          valueKey="nodeName"
          defaultSelectedClusters={searchParams.getAll('cluster')}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('cluster');
              value.forEach((cluster) => {
                prev.append('cluster', cluster);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('cluster');
              prev.delete('page');
              return prev;
            });
          }}
          agentRunning={false}
        />
      </div>
      {appliedFilterCount > 0 ? (
        <div className="flex gap-2.5 mt-4 flex-wrap items-center">
          {(
            Array.from(searchParams).filter(([key]) => {
              return Object.keys(FILTER_SEARCHPARAMS).includes(key);
            }) as Array<[FILTER_SEARCHPARAMS_KEYS_ENUM, string]>
          ).map(([key, value]) => {
            if (FILTER_SEARCHPARAMS_DYNAMIC_KEYS.includes(key)) {
              return (
                <FilterBadge
                  key={`${key}-${value}`}
                  nodeType={(() => {
                    if (key === FILTER_SEARCHPARAMS_KEYS_ENUM.host) {
                      return 'host';
                    } else if (key === FILTER_SEARCHPARAMS_KEYS_ENUM.containerImage) {
                      return 'containerImage';
                    } else if (key === FILTER_SEARCHPARAMS_KEYS_ENUM.cluster) {
                      return 'cluster';
                    } else if (key === FILTER_SEARCHPARAMS_KEYS_ENUM.container) {
                      return 'container';
                    }
                    throw new Error('unknown key');
                  })()}
                  onRemove={onFilterRemove({ key, value })}
                  id={value}
                  label={FILTER_SEARCHPARAMS[key]}
                />
              );
            }

            return (
              <FilterBadge
                key={`${key}-${value}`}
                onRemove={onFilterRemove({ key, value })}
                text={value}
                label={FILTER_SEARCHPARAMS[key]}
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
