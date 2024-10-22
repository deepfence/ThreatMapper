import { useSuspenseQuery } from '@suspensive/react-query';
import { capitalize } from 'lodash-es';
import { matchSorter } from 'match-sorter';
import {
  ReactNode,
  startTransition,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  FetcherWithComponents,
  generatePath,
  useFetcher,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  Badge,
  Button,
  Combobox,
  ComboboxOption,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  RowSelectionState,
  Table,
  TableSkeleton,
  Tabs,
  TextInput,
} from 'ui-components';

import { ModelBenchmarkType, ModelCloudNodeComplianceControl } from '@/api/generated';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { EyeHideSolid } from '@/components/icons/common/EyeHideSolid';
import { EyeSolidIcon } from '@/components/icons/common/EyeSolid';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TimesIcon } from '@/components/icons/common/Times';
import { complianceType } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { TruncatedText } from '@/components/TruncatedText';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { ActionEnumType } from '@/features/postures/data-component/toggleControlApiAction';
import { queries } from '@/queries';
import { ComplianceScanNodeTypeEnum } from '@/types/common';
import { getBenchmarkPrettyName } from '@/utils/enum';

type ParamsNodeType = 'aws' | 'azure' | 'gcp' | 'linux' | 'k8s';

const maskUnmaskControls = ({
  actionType,
  controlIds,
  fetcher,
  checkType,
  nodeType,
}: {
  actionType: ActionEnumType;
  controlIds: string[] | undefined;
  fetcher: FetcherWithComponents<null>;
  checkType: string;
  nodeType: string;
}) => {
  if (!controlIds) {
    throw new Error('Control ids cannot be empty');
  }
  const formData = new FormData();
  formData.append('actionType', actionType);
  controlIds.forEach((item) => formData.append('controlIds[]', item));
  fetcher.submit(formData, {
    method: 'post',
    action: generatePath('/data-component/list/controls/:nodeType/:checkType', {
      checkType,
      nodeType,
    }),
  });
};

const PrettyNames: Record<ParamsNodeType, string> = {
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
  k8s: 'Kubernetes',
  linux: 'Linux',
};

const ParamsToNodeType: Record<ParamsNodeType, ComplianceScanNodeTypeEnum> = {
  aws: ComplianceScanNodeTypeEnum.aws,
  azure: ComplianceScanNodeTypeEnum.azure,
  gcp: ComplianceScanNodeTypeEnum.gcp,
  k8s: ComplianceScanNodeTypeEnum.kubernetes_cluster,
  linux: ComplianceScanNodeTypeEnum.host,
};

const getAppliedFiltersCount = (filterData: FilterData) => {
  let count = 0;
  if (filterData.enabled !== undefined) {
    count++;
  }
  if (filterData.searchText?.length) {
    count++;
  }
  return count;
};

interface FilterData {
  enabled?: boolean | undefined;
  searchText?: string | undefined;
}

const Controls = () => {
  const params = useParams<{ nodeType: ParamsNodeType }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const fetcher = useFetcher<null>();
  const [filterData, setFilterData] = useState<FilterData>({});

  if (!params.nodeType) {
    throw new Error('invalid node type');
  }

  const tabs = complianceType[ParamsToNodeType[params.nodeType!]].map((bench) => {
    return {
      label: getBenchmarkPrettyName(bench),
      value: bench,
    };
  });

  useEffect(() => {
    setSearchParams((prev) => {
      prev.delete('benchmark');
      return prev;
    });
    setRowSelectionState({});
    setFiltersExpanded(false);
    setFilterData({});
  }, [params.nodeType]);

  const benchmarkSearchParam = searchParams.get('benchmark');

  useEffect(() => {
    setRowSelectionState({});
    setFiltersExpanded(false);
    setFilterData({});
  }, [benchmarkSearchParam]);

  const currentTab = benchmarkSearchParam ?? tabs[0].value;

  const selectedRows = useMemo<string[]>(() => {
    return Object.keys(rowSelectionState);
  }, [rowSelectionState]);

  const onTableAction = (row: string, actionType: string) => {
    if (actionType === ActionEnumType.DISABLE || actionType === ActionEnumType.ENABLE) {
      maskUnmaskControls({
        actionType,
        checkType: currentTab,
        nodeType: params.nodeType ?? '',
        controlIds: [row],
        fetcher,
      });
    }
  };

  const onBulkAction = (rows: string[], actionType: string) => {
    if (actionType === ActionEnumType.ENABLE || actionType === ActionEnumType.DISABLE) {
      maskUnmaskControls({
        actionType,
        checkType: currentTab,
        nodeType: params.nodeType ?? '',
        controlIds: rows,
        fetcher,
      });
    }
  };

  return (
    <>
      <div className="mt-2">
        <h6 className="text-h6 text-text-input-value">
          {PrettyNames[params.nodeType]} controls management
        </h6>
        <Tabs
          value={currentTab}
          tabs={tabs}
          onValueChange={(v) => {
            setSearchParams((prev) => {
              prev.set('benchmark', v);
              return prev;
            });
          }}
        >
          <div className="h-12 flex items-center">
            <BulkActions selectedRows={selectedRows} onBulkAction={onBulkAction} />
            <Button
              variant="flat"
              className="ml-auto"
              startIcon={<FilterIcon />}
              endIcon={
                getAppliedFiltersCount(filterData) > 0 ? (
                  <Badge
                    label={String(getAppliedFiltersCount(filterData))}
                    variant="filled"
                    size="small"
                    color="blue"
                  />
                ) : null
              }
              size="sm"
              onClick={() => {
                setFiltersExpanded((prev) => !prev);
              }}
              data-testid="filterButtonIdForTable"
            >
              Filter
            </Button>
          </div>
          {filtersExpanded ? (
            <Filters filterData={filterData} setFilterData={setFilterData} />
          ) : null}
          <Suspense fallback={<Skeleton />}>
            {currentTab.length ? (
              <PostureControlsTable
                benchmarkType={currentTab as ModelBenchmarkType}
                nodeType={ParamsToNodeType[params.nodeType]}
                rowSelectionState={rowSelectionState}
                setRowSelectionState={setRowSelectionState}
                onTableAction={onTableAction}
                filterData={filterData}
              />
            ) : null}
          </Suspense>
        </Tabs>
      </div>
    </>
  );
};

const Skeleton = () => {
  return <TableSkeleton rows={10} columns={5} />;
};

const useGetControls = ({
  checkType,
  nodeType,
}: {
  checkType: ModelBenchmarkType;
  nodeType: string;
}) => {
  if (nodeType === 'kubernetes_cluster') nodeType = 'kubernetes';
  if (nodeType === 'host') nodeType = 'linux';

  return useSuspenseQuery({
    ...queries.posture.listControls({ checkType, nodeType }),
  });
};

const PostureControlsTable = ({
  benchmarkType,
  nodeType,
  rowSelectionState,
  setRowSelectionState,
  onTableAction,
  filterData,
}: {
  benchmarkType: ModelBenchmarkType;
  nodeType: ComplianceScanNodeTypeEnum;
  rowSelectionState: RowSelectionState;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  onTableAction: (row: string, actionType: ActionEnumType) => void;
  filterData: FilterData;
}) => {
  const [pageSize, setPageSize] = useState(10);
  const { data } = useGetControls({
    checkType: benchmarkType,
    nodeType: nodeType,
  });
  const columnHelper = createColumnHelper<ModelCloudNodeComplianceControl>();
  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 10,
        size: 10,
        maxSize: 10,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => (
          <ActionDropdown
            onTableAction={onTableAction}
            masked={cell.row.original.enabled ? false : true}
            controlId={cell.row.original.node_id ?? ''}
            trigger={
              <button className="h-[16px] w-[16px] text-text-text-and-icon rotate-90">
                <EllipsisIcon />
              </button>
            }
          />
        ),
        header: () => '',
        size: 30,
        minSize: 30,
        maxSize: 30,
        enableResizing: false,
      }),
      columnHelper.accessor('category_hierarchy_short', {
        id: 'category',
        cell: (info) => {
          let text = info.getValue() ?? '';
          if (!text.length) {
            text = info.row.original?.category_hierarchy?.join(', ') ?? '';
          }
          return <TruncatedText text={text} />;
        },
        header: () => <span>Category</span>,
        maxSize: 200,
        size: 140,
        minSize: 60,
      }),
      columnHelper.accessor('problem_title', {
        header: () => 'Title',
        cell: (info) => <TruncatedText text={info.getValue() ?? ''} />,
        maxSize: 320,
        size: 260,
        minSize: 200,
      }),
      columnHelper.accessor('description', {
        header: () => 'Description',
        cell: (info) => <TruncatedText text={info.getValue() ?? ''} />,
        maxSize: 280,
        size: 360,
        minSize: 600,
      }),
    ],
    [],
  );

  const filteredControls = useMemo(() => {
    let controls = data.controls;
    if (filterData.enabled !== undefined) {
      controls = controls.filter((c) => c.enabled === filterData.enabled);
    }
    if (filterData.searchText?.length) {
      controls = matchSorter(controls, filterData.searchText, {
        keys: ['control_id', 'problem_title', 'description', 'category_hierarchy_short'],
        threshold: matchSorter.rankings.ACRONYM,
        sorter: (rankedItems) => rankedItems,
      });
    }
    return controls;
  }, [data, filterData]);

  return (
    <Table
      data={filteredControls}
      columns={columns}
      enablePagination
      enableColumnResizing
      enableSorting
      enablePageResize
      pageSize={pageSize}
      getRowId={(row) => {
        return row.node_id ?? '';
      }}
      onPageResize={(newSize) => {
        setPageSize(newSize);
      }}
      rowSelectionState={rowSelectionState}
      onRowSelectionChange={setRowSelectionState}
      enableRowSelection
      getTrProps={(row) => {
        if (!row.original.enabled) {
          return {
            className: 'opacity-40',
          };
        }
        return {};
      }}
    />
  );
};

const BulkActions = ({
  selectedRows,
  onBulkAction,
}: {
  selectedRows: string[];
  onBulkAction: (selectedRows: string[], actionType: ActionEnumType) => void;
}) => {
  return (
    <>
      <Button
        color="default"
        variant="flat"
        size="sm"
        startIcon={<EyeHideSolid />}
        disabled={!selectedRows.length}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onBulkAction(selectedRows, ActionEnumType.DISABLE);
        }}
      >
        Disable
      </Button>
      <Button
        color="default"
        variant="flat"
        size="sm"
        startIcon={<EyeSolidIcon />}
        disabled={!selectedRows.length}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onBulkAction(selectedRows, ActionEnumType.ENABLE);
        }}
      >
        Enable
      </Button>
    </>
  );
};

const Filters = ({
  filterData,
  setFilterData,
}: {
  filterData: FilterData;
  setFilterData: React.Dispatch<React.SetStateAction<FilterData>>;
}) => {
  const [enabledQuery, setEnabledQuery] = useState('');
  const appliedFilterCount = getAppliedFiltersCount(filterData);

  return (
    <FilterWrapper>
      <div className="flex gap-2">
        <Combobox
          getDisplayValue={() => 'Enabled/Disabled'}
          multiple
          value={
            filterData.enabled === undefined
              ? []
              : filterData.enabled
                ? ['enabled']
                : ['disabled']
          }
          onChange={(values) => {
            startTransition(() => {
              setFilterData((prev) => {
                if (values.includes('enabled') && values.includes('disabled')) {
                  return {
                    ...prev,
                    enabled: undefined,
                  };
                } else if (!values.length) {
                  return {
                    ...prev,
                    enabled: undefined,
                  };
                }
                return {
                  ...prev,
                  enabled: values.includes('enabled'),
                };
              });
            });
          }}
          onQueryChange={(query) => {
            setEnabledQuery(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            startTransition(() => {
              setFilterData((prev) => {
                return {
                  ...prev,
                  enabled: undefined,
                };
              });
            });
          }}
        >
          {['enabled', 'disabled']
            .filter((item) => {
              if (!enabledQuery.length) return true;
              return item.includes(enabledQuery.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {capitalize(item)}
                </ComboboxOption>
              );
            })}
        </Combobox>
        <TextInput
          placeholder="Search controls"
          className="max-w-96"
          value={filterData.searchText ?? ''}
          onChange={(e) => {
            startTransition(() => {
              setFilterData((prev) => {
                return {
                  ...prev,
                  searchText: e.target.value,
                };
              });
            });
          }}
        />
      </div>
      {appliedFilterCount > 0 ? (
        <div className="flex gap-2.5 mt-4 flex-wrap items-center">
          {filterData.enabled !== undefined ? (
            <FilterBadge
              onRemove={() => {
                startTransition(() => {
                  setFilterData((prev) => {
                    return {
                      ...prev,
                      enabled: undefined,
                    };
                  });
                });
              }}
              text={`Status: ${filterData.enabled ? 'Enabled' : 'Disabled'}`}
            />
          ) : null}
          {filterData.searchText?.length ? (
            <FilterBadge
              onRemove={() => {
                startTransition(() => {
                  setFilterData((prev) => {
                    return {
                      ...prev,
                      searchText: undefined,
                    };
                  });
                });
              }}
              text={`Search: ${filterData.searchText}`}
            />
          ) : null}
          <Button
            variant="flat"
            color="default"
            startIcon={<TimesIcon />}
            onClick={() => {
              startTransition(() => {
                setFilterData({});
              });
            }}
            size="sm"
          >
            Clear all
          </Button>
        </div>
      ) : null}
    </FilterWrapper>
  );
};

const ActionDropdown = ({
  trigger,
  onTableAction,
  masked,
  controlId,
}: {
  controlId: string;
  masked: boolean;
  trigger: ReactNode;
  onTableAction: (row: string, actionType: ActionEnumType) => void;
}) => {
  return (
    <Dropdown
      triggerAsChild={true}
      align={'start'}
      content={
        <>
          {masked ? (
            <DropdownItem
              onSelect={() => onTableAction(controlId, ActionEnumType.ENABLE)}
            >
              Enable control
            </DropdownItem>
          ) : (
            <DropdownItem
              onSelect={() => onTableAction(controlId, ActionEnumType.DISABLE)}
            >
              Disable control
            </DropdownItem>
          )}
        </>
      }
    >
      {trigger}
    </Dropdown>
  );
};

export const module = {
  element: <Controls />,
};
