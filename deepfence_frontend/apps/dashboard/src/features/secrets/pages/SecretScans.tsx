import { useSuspenseQuery } from '@suspensive/react-query';
import { useIsFetching } from '@tanstack/react-query';
import { capitalize } from 'lodash-es';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionFunctionArgs,
  generatePath,
  useFetcher,
  useSearchParams,
} from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  BreadcrumbLink,
  Button,
  CircleSpinner,
  Combobox,
  ComboboxOption,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  Modal,
  RowSelectionState,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getScanResultsApiClient } from '@/api/api';
import {
  ModelBulkDeleteScansRequestScanTypeEnum,
  ModelScanInfo,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableContainerList } from '@/components/forms/SearchableContainerList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { SearchableImageList } from '@/components/forms/SearchableImageList';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TimesIcon } from '@/components/icons/common/Times';
import { TrashLineIcon } from '@/components/icons/common/TrashLine';
import { StopScanForm } from '@/components/scan-configure-forms/StopScanForm';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { TruncatedText } from '@/components/TruncatedText';
import { SEVERITY_COLORS } from '@/constants/charts';
import { useDownloadScan } from '@/features/common/data-component/downloadScanAction';
import { IconMapForNodeType } from '@/features/onboard/components/IconMapForNodeType';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import {
  isNeverScanned,
  isScanComplete,
  isScanInProgress,
  isScanStopping,
  SCAN_STATUS_GROUPS,
  SecretScanGroupedStatus,
} from '@/utils/scan';
import { getOrderFromSearchParams, useSortingState } from '@/utils/table';

export interface FocusableElement {
  focus(options?: FocusOptions): void;
}

enum ActionEnumType {
  DELETE = 'delete',
}

const DEFAULT_PAGE_SIZE = 10;

type ScanResult = ModelScanInfo & {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unknown: number;
};

const action = async ({
  request,
}: ActionFunctionArgs): Promise<
  | {
      url: string;
    }
  | null
  | { success: boolean; message?: string }
> => {
  const formData = await request.formData();
  const actionType = formData.get('actionType');
  const scanIds = formData.getAll('scanId');

  if (!actionType || scanIds.length === 0) {
    throw new Error('Invalid action');
  }

  if (actionType === ActionEnumType.DELETE) {
    const resultApi = apiWrapper({
      fn: getScanResultsApiClient().bulkDeleteScans,
    });
    const result = await resultApi({
      modelBulkDeleteScansRequest: {
        filters: {
          compare_filter: null,
          contains_filter: {
            filter_in: {
              node_id: scanIds,
            },
          },
          order_filter: { order_fields: [] },
          match_filter: { filter_in: {} },
        },
        scan_type: ModelBulkDeleteScansRequestScanTypeEnum.Secret,
      },
    });
    if (!result.ok) {
      if (result.error.response.status === 400 || result.error.response.status === 409) {
        const { message } = await getResponseErrors(result.error);
        return {
          success: false,
          message,
        };
      } else if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        return {
          success: false,
          message,
        };
      }
      throw result.error;
    }
  }
  invalidateAllQueries();
  return {
    success: true,
  };
};

const DeleteConfirmationModal = ({
  showDialog,
  scanIds,
  setShowDialog,
  onDeleteSuccess,
}: {
  showDialog: boolean;
  scanIds: string[];
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onDeleteSuccess: () => void;
}) => {
  const fetcher = useFetcher();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      scanIds.forEach((scanId) => formData.append('scanId', scanId));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [scanIds, fetcher],
  );

  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data?.success &&
      fetcher.data.action === ActionEnumType.DELETE
    ) {
      onDeleteSuccess();
    }
  }, [fetcher]);

  return (
    <Modal
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      size="s"
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center dark:text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Delete scan
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
          <div className={'flex gap-x-3 justify-end'}>
            <Button
              size="md"
              onClick={() => setShowDialog(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="md"
              color="error"
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
              onClick={(e) => {
                e.preventDefault();
                onDeleteAction(ActionEnumType.DELETE);
              }}
            >
              Delete
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <div className="grid">
          Selected scan will be deleted.
          <br />
          <span>Are you sure you want to delete?</span>
          {fetcher.data?.message && (
            <p className="mt-2 text-p7 dark:text-status-error">{fetcher.data?.message}</p>
          )}
        </div>
      ) : (
        <SuccessModalContent text="Deleted successfully!" />
      )}
    </Modal>
  );
};

const ActionDropdown = ({
  trigger,
  row,
}: {
  trigger: React.ReactNode;
  row: ModelScanInfo;
}) => {
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { downloadScan } = useDownloadScan((state) => {
    setIsSubmitting(state === 'submitting');
  });
  const [openStopScanModal, setOpenStopScanModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const {
    scan_id: scanId,
    node_id: nodeId,
    node_type: nodeType,
    status: scanStatus,
  } = row;
  const [showStartScan, setShowStartScan] = useState(false);

  const onDownloadAction = useCallback(() => {
    downloadScan({
      scanId,
      nodeType: nodeType as UtilsReportFiltersNodeTypeEnum,
      scanType: UtilsReportFiltersScanTypeEnum.Secret,
    });
  }, [scanId, nodeId, fetcher]);

  useEffect(() => {
    if (fetcher.state === 'idle') setOpen(false);
  }, [fetcher]);

  return (
    <>
      {openStopScanModal && (
        <StopScanForm
          open={openStopScanModal}
          closeModal={setOpenStopScanModal}
          scanIds={[scanId]}
          scanType={ScanTypeEnum.SecretScan}
        />
      )}

      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          scanIds={[scanId]}
          setShowDialog={setShowDeleteDialog}
          onDeleteSuccess={() => {
            //
          }}
        />
      )}

      {showStartScan && (
        <ConfigureScanModal
          open={true}
          onOpenChange={() => setShowStartScan(false)}
          scanOptions={
            {
              showAdvancedOptions: true,
              scanType: ScanTypeEnum.SecretScan,
              data: {
                nodes: [
                  {
                    nodeId,
                    nodeType,
                  },
                ],
              },
            } as ConfigureScanModalProps['scanOptions']
          }
        />
      )}

      <Dropdown
        triggerAsChild
        align="start"
        open={open}
        onOpenChange={setOpen}
        content={
          <>
            <DropdownItem
              onClick={(e) => {
                if (!isScanComplete(scanStatus)) return;
                e.preventDefault();
                onDownloadAction();
              }}
              disabled={!isScanComplete(scanStatus) || isSubmitting}
            >
              <span className="flex text-center gap-x-2">
                {isSubmitting && <CircleSpinner size="sm" />}Download report
              </span>
            </DropdownItem>
            <DropdownItem
              onClick={(e) => {
                e.preventDefault();
                if (isScanInProgress(scanStatus)) return;
                setShowStartScan(true);
              }}
              disabled={isScanInProgress(scanStatus) || isScanStopping(scanStatus)}
            >
              <span>Start scan</span>
            </DropdownItem>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setOpenStopScanModal(true);
              }}
              disabled={!isScanInProgress(scanStatus)}
            >
              <span className="flex items-center">Cancel scan</span>
            </DropdownItem>
            <DropdownItem
              className="text-sm"
              onClick={() => {
                if (!scanId || !nodeType) return;
                setShowDeleteDialog(true);
              }}
              disabled={!scanId || !nodeType}
            >
              <span className="text-red-700 dark:text-status-error dark:hover:text-[#C45268]">
                Delete scan
              </span>
            </DropdownItem>
          </>
        }
      >
        {trigger}
      </Dropdown>
    </>
  );
};

const FILTER_SEARCHPARAMS: Record<string, string> = {
  nodeType: 'Node Type',
  secretScanStatus: 'Secret scan status',
  containerImages: 'Container image',
  containers: 'Container',
  hosts: 'Host',
  clusters: 'Cluster',
};

const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};
const Filters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [nodeType, setNodeType] = useState('');
  const [secretScanStatusSearchText, setSecretScanStatusSearchText] = useState('');

  const appliedFilterCount = getAppliedFiltersCount(searchParams);
  return (
    <div className="px-4 py-2.5 mb-4 border dark:border-bg-hover-3 rounded-[5px] overflow-hidden dark:bg-bg-left-nav">
      <div className="flex gap-2">
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
              prev.delete('page');
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setNodeType(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('nodeType');
              prev.delete('page');
              return prev;
            });
          }}
        >
          {['host', 'container', 'container_image']
            .filter((item) => {
              if (!nodeType.length) return true;
              return item.includes(nodeType.toLowerCase());
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
          value={
            searchParams.get('secretScanStatus')?.length
              ? SCAN_STATUS_GROUPS.find((groupStatus) => {
                  return groupStatus.value === searchParams.get('secretScanStatus');
                })
              : null
          }
          nullable
          onQueryChange={(query) => {
            setSecretScanStatusSearchText(query);
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              if (value) {
                prev.set('secretScanStatus', value.value);
              } else {
                prev.delete('secretScanStatus');
              }
              prev.delete('page');
              return prev;
            });
          }}
          getDisplayValue={() => FILTER_SEARCHPARAMS['secretScanStatus']}
        >
          {SCAN_STATUS_GROUPS.filter((item) => {
            if (item.value === 'neverScanned') {
              return false;
            }
            if (!secretScanStatusSearchText.length) return true;
            return item.label
              .toLowerCase()
              .includes(secretScanStatusSearchText.toLowerCase());
          }).map((item) => {
            return (
              <ComboboxOption key={item.value} value={item}>
                {item.label}
              </ComboboxOption>
            );
          })}
        </Combobox>

        <SearchableImageList
          scanType={ScanTypeEnum.SecretScan}
          defaultSelectedImages={searchParams.getAll('containerImages')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('containerImages');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('containerImages');
              value.forEach((containerImage) => {
                prev.append('containerImages', containerImage);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
        <SearchableContainerList
          scanType={ScanTypeEnum.SecretScan}
          defaultSelectedContainers={searchParams.getAll('containers')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('containers');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('containers');
              value.forEach((container) => {
                prev.append('containers', container);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
        <SearchableHostList
          scanType={ScanTypeEnum.SecretScan}
          defaultSelectedHosts={searchParams.getAll('hosts')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('hosts');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('hosts');
              value.forEach((host) => {
                prev.append('hosts', host);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
        <SearchableClusterList
          defaultSelectedClusters={searchParams.getAll('clusters')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('clusters');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('clusters');
              value.forEach((cluster) => {
                prev.append('clusters', cluster);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
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

const ScansTable = ({
  rowSelectionState,
  setRowSelectionState,
}: {
  rowSelectionState: RowSelectionState;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = useSuspenseQuery({
    ...queries.secret.scanList({
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      clusters: searchParams.getAll('clusters'),
      containers: searchParams.getAll('containers'),
      hosts: searchParams.getAll('hosts'),
      images: searchParams.getAll('containerImages'),
      nodeTypes: searchParams.getAll('nodeType').length
        ? searchParams.getAll('nodeType')
        : ['container_image', 'container', 'host'],
      page: parseInt(searchParams.get('page') ?? '0', 10),
      order: getOrderFromSearchParams(searchParams),
      secretScanStatus: searchParams.get('secretScanStatus') as
        | SecretScanGroupedStatus
        | undefined,
    }),
    keepPreviousData: true,
  });
  const [sort, setSort] = useSortingState();
  const columnHelper = createColumnHelper<ScanResult>();

  const columns = useMemo(() => {
    const columns = [
      getRowSelectionColumn(columnHelper, {
        size: 45,
        minSize: 45,
        maxSize: 45,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => (
          <ActionDropdown
            row={cell.row.original}
            trigger={
              <button className="p-1 flex">
                <span className="block h-4 w-4 dark:text-text-text-and-icon rotate-90 shrink-0">
                  <EllipsisIcon />
                </span>
              </button>
            }
          />
        ),
        header: () => '',
        size: 30,
        minSize: 30,
        maxSize: 50,
        enableResizing: false,
      }),
      columnHelper.accessor('node_type', {
        enableSorting: false,
        cell: (info) => {
          return (
            <div className="flex items-center gap-x-2 capitalize">
              <div className="rounded-lg w-4 h-4 shrink-0">
                {IconMapForNodeType[info.getValue()]}
              </div>
              <TruncatedText text={info.getValue()?.replaceAll('_', ' ') ?? ''} />
            </div>
          );
        },
        header: () => <TruncatedText text="Type" />,
        minSize: 100,
        size: 120,
        maxSize: 130,
      }),
      columnHelper.accessor('node_name', {
        enableSorting: false,
        cell: (info) => {
          const isNeverScan = isNeverScanned(info.row.original.status);
          if (isNeverScan) {
            return <TruncatedText text={info.getValue()} />;
          }
          return (
            <DFLink
              to={generatePath(`/secret/scan-results/:scanId`, {
                scanId: encodeURIComponent(info.row.original.scan_id),
              })}
            >
              <TruncatedText text={info.getValue()} />
            </DFLink>
          );
        },
        header: () => 'Name',
        minSize: 230,
        size: 240,
        maxSize: 250,
      }),
      columnHelper.accessor('updated_at', {
        cell: (info) => <TruncatedText text={formatMilliseconds(info.getValue())} />,
        header: () => <TruncatedText text="Timestamp" />,
        minSize: 140,
        size: 140,
        maxSize: 150,
      }),
      columnHelper.accessor('status', {
        enableSorting: true,
        cell: (info) => <ScanStatusBadge status={info.getValue()} />,
        header: () => <TruncatedText text="Scan Status" />,
        minSize: 100,
        size: 110,
        maxSize: 110,
        enableResizing: true,
      }),
      columnHelper.accessor('total', {
        enableSorting: false,
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
      columnHelper.accessor('critical', {
        enableSorting: false,
        cell: (info) => {
          const params = new URLSearchParams();
          params.set('severity', 'critical');
          return (
            <div className="flex items-center gap-x-2 tabular-nums">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  backgroundColor: SEVERITY_COLORS['critical'],
                }}
              ></div>
              <DFLink
                to={generatePath(`/secret/scan-results/:scanId/?${params.toString()}`, {
                  scanId: encodeURIComponent(info.row.original.scan_id),
                })}
              >
                {info.getValue()}
              </DFLink>
            </div>
          );
        },
        header: () => <TruncatedText text="Critical" />,
        minSize: 80,
        size: 80,
        maxSize: 80,
      }),
      columnHelper.accessor('high', {
        enableSorting: false,
        cell: (info) => {
          const params = new URLSearchParams();
          params.set('severity', 'high');
          return (
            <div className="flex items-center gap-x-2 tabular-nums">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  backgroundColor: SEVERITY_COLORS['high'],
                }}
              ></div>
              <DFLink
                to={generatePath(`/secret/scan-results/:scanId/?${params.toString()}`, {
                  scanId: encodeURIComponent(info.row.original.scan_id),
                })}
              >
                {info.getValue()}
              </DFLink>
            </div>
          );
        },
        header: () => <TruncatedText text="High" />,
        minSize: 80,
        size: 80,
        maxSize: 80,
      }),
      columnHelper.accessor('medium', {
        enableSorting: false,
        cell: (info) => {
          const params = new URLSearchParams();
          params.set('severity', 'medium');
          return (
            <div className="flex items-center gap-x-2 tabular-nums">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  backgroundColor: SEVERITY_COLORS['medium'],
                }}
              ></div>
              <DFLink
                to={generatePath(`/secret/scan-results/:scanId/?${params.toString()}`, {
                  scanId: encodeURIComponent(info.row.original.scan_id),
                })}
              >
                {info.getValue()}
              </DFLink>
            </div>
          );
        },
        header: () => <TruncatedText text="Medium" />,
        minSize: 80,
        size: 80,
        maxSize: 80,
      }),
      columnHelper.accessor('low', {
        enableSorting: false,
        cell: (info) => {
          const params = new URLSearchParams();
          params.set('severity', 'low');
          return (
            <div className="flex items-center gap-x-2 tabular-nums">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: SEVERITY_COLORS['low'],
                }}
              ></div>
              <DFLink
                to={generatePath(`/secret/scan-results/:scanId/?${params.toString()}`, {
                  scanId: encodeURIComponent(info.row.original.scan_id),
                })}
              >
                {info.getValue()}
              </DFLink>
            </div>
          );
        },
        header: () => <TruncatedText text="Low" />,
        minSize: 80,
        size: 80,
        maxSize: 80,
      }),
      columnHelper.accessor('unknown', {
        enableSorting: false,
        cell: (info) => {
          const params = new URLSearchParams();
          params.set('severity', 'unknown');
          return (
            <div className="flex items-center gap-x-2 tabular-nums">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  backgroundColor: SEVERITY_COLORS['unknown'],
                }}
              ></div>
              <DFLink
                to={generatePath(`/secret/scan-results/:scanId/?${params.toString()}`, {
                  scanId: encodeURIComponent(info.row.original.scan_id),
                })}
              >
                {info.getValue()}
              </DFLink>
            </div>
          );
        },
        header: () => <TruncatedText text="Unknown" />,
        minSize: 80,
        size: 80,
        maxSize: 80,
      }),
    ];

    return columns;
  }, []);

  return (
    <>
      <Table
        data={data.scans}
        columns={columns}
        enableRowSelection
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        getRowId={(row) => {
          return JSON.stringify({
            scanId: row.scan_id,
            nodeId: row.node_id,
            nodeType: row.node_type,
            updatedAt: row.updated_at,
            scanStatus: row.status,
          });
        }}
        enablePagination
        manualPagination
        enableColumnResizing
        approximatePagination
        totalRows={data.totalRows}
        pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
        pageIndex={data.currentPage}
        onPaginationChange={(updaterOrValue) => {
          let newPageIndex = 0;
          if (typeof updaterOrValue === 'function') {
            newPageIndex = updaterOrValue({
              pageIndex: data.currentPage,
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
        enableSorting
        manualSorting
        sortingState={sort}
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
        enablePageResize
        onPageResize={(newSize) => {
          setSearchParams((prev) => {
            prev.set('size', String(newSize));
            prev.delete('page');
            return prev;
          });
        }}
      />
    </>
  );
};

const BulkActions = ({
  selectedRows,
  setRowSelectionState,
}: {
  selectedRows: {
    scanId: string;
    nodeId: string;
    nodeType: string;
    scanStatus: string;
  }[];
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}) => {
  const [openStartScan, setOpenStartScan] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelScanDialog, setShowCancelScanDialog] = useState(false);
  const nodesToStartScan = useMemo(() => {
    return selectedRows
      .filter(
        (row) => !isScanInProgress(row.scanStatus) && !isScanStopping(row.scanStatus),
      )
      .map((row) => {
        return {
          nodeId: row.nodeId,
          nodeType: row.nodeType,
        };
      });
  }, [selectedRows]);

  const scanIdsToCancelScan = useMemo(() => {
    return selectedRows
      .filter((row) => isScanInProgress(row.scanStatus))
      .map((row) => row.scanId);
  }, [selectedRows]);

  const scanIdsToDeleteScan = useMemo(() => {
    return selectedRows
      .filter((row) => !isNeverScanned(row.scanStatus))
      .map((row) => row.scanId);
  }, [selectedRows]);

  return (
    <>
      {openStartScan && (
        <ConfigureScanModal
          open={true}
          onOpenChange={() => setOpenStartScan(false)}
          onSuccess={() => setRowSelectionState({})}
          scanOptions={
            {
              showAdvancedOptions: true,
              scanType: ScanTypeEnum.SecretScan,
              data: {
                nodes: nodesToStartScan,
              },
            } as ConfigureScanModalProps['scanOptions']
          }
        />
      )}

      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          scanIds={scanIdsToDeleteScan}
          setShowDialog={setShowDeleteDialog}
          onDeleteSuccess={() => {
            setRowSelectionState({});
          }}
        />
      )}
      {showCancelScanDialog ? (
        <StopScanForm
          open={showCancelScanDialog}
          closeModal={setShowCancelScanDialog}
          scanIds={scanIdsToCancelScan}
          scanType={ScanTypeEnum.SecretScan}
          onCancelScanSuccess={() => {
            setRowSelectionState({});
          }}
        />
      ) : null}

      <Button
        color="default"
        variant="flat"
        size="sm"
        disabled={nodesToStartScan.length == 0}
        onClick={() => {
          setOpenStartScan(true);
        }}
      >
        Start Scan
      </Button>
      <Button
        color="default"
        variant="flat"
        size="sm"
        disabled={scanIdsToCancelScan.length === 0}
        onClick={() => setShowCancelScanDialog(true)}
      >
        Cancel Scan
      </Button>
      <Button
        color="error"
        variant="flat"
        startIcon={<TrashLineIcon />}
        size="sm"
        disabled={scanIdsToDeleteScan.length === 0}
        onClick={() => {
          setShowDeleteDialog(true);
        }}
      >
        Delete Scan
      </Button>
    </>
  );
};

const SecretScans = () => {
  const [searchParams] = useSearchParams();

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const isFetching = useIsFetching({
    queryKey: queries.secret.scanList._def,
  });

  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});

  const selectedRows = useMemo<
    {
      scanId: string;
      nodeId: string;
      nodeType: string;
      scanStatus: string;
    }[]
  >(() => {
    return Object.keys(rowSelectionState).map((item) => {
      return JSON.parse(item);
    });
  }, [rowSelectionState]);

  return (
    <div>
      <div className="flex pl-4 pr-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<SecretsIcon />} isLink>
            <DFLink to={'/secret'} unstyled>
              Secrets
            </DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">Secret Scans</span>
          </BreadcrumbLink>
        </Breadcrumb>

        <div className="ml-2 flex items-center">
          {isFetching ? <CircleSpinner size="sm" /> : null}
        </div>
      </div>

      <div className="mx-4">
        <div className="h-12 flex items-center">
          <BulkActions
            selectedRows={selectedRows}
            setRowSelectionState={setRowSelectionState}
          />
          <Button
            variant="flat"
            className="ml-auto"
            startIcon={<FilterIcon />}
            endIcon={
              getAppliedFiltersCount(searchParams) > 0 ? (
                <Badge
                  label={String(getAppliedFiltersCount(searchParams))}
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
          >
            Filter
          </Button>
        </div>

        {filtersExpanded ? <Filters /> : null}
        <Suspense fallback={<TableSkeleton columns={7} rows={15} />}>
          <ScansTable
            rowSelectionState={rowSelectionState}
            setRowSelectionState={setRowSelectionState}
          />
        </Suspense>
      </div>
    </div>
  );
};

export const module = {
  action,
  element: <SecretScans />,
};
