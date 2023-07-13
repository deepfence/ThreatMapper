import { useSuspenseQuery } from '@suspensive/react-query';
import { useIsFetching } from '@tanstack/react-query';
import cx from 'classnames';
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
  Modal,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getScanResultsApiClient } from '@/api/api';
import {
  ModelScanInfo,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
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
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { TruncatedText } from '@/components/TruncatedText';
import { SEVERITY_COLORS } from '@/constants/charts';
import { useDownloadScan } from '@/features/common/data-component/downloadScanAction';
import { IconMapForNodeType } from '@/features/onboard/components/IconMapForNodeType';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import {
  isNeverScanned,
  isScanComplete,
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
  const scanId = formData.get('scanId');
  const nodeId = formData.get('nodeId');
  if (!actionType || !scanId || !nodeId) {
    throw new Error('Invalid action');
  }

  if (actionType === ActionEnumType.DELETE) {
    const resultApi = apiWrapper({
      fn: getScanResultsApiClient().deleteScanResultsForScanID,
    });
    const result = await resultApi({
      scanId: scanId.toString(),
      scanType: ScanTypeEnum.SecretScan,
    });
    if (!result.ok) {
      if (result.error.response.status === 400 || result.error.response.status === 409) {
        return {
          success: false,
          message: result.error.message ?? '',
        };
      } else if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        return {
          success: false,
          message,
        };
      }
    }

    return {
      success: true,
    };
  }
  return null;
};

const DeleteConfirmationModal = ({
  showDialog,
  scanId,
  nodeId,
  setShowDialog,
}: {
  showDialog: boolean;
  scanId: string;
  nodeId: string;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      formData.append('scanId', scanId);
      formData.append('nodeId', nodeId);
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [scanId, nodeId, fetcher],
  );

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
              onClick={(e) => {
                e.preventDefault();
                onDeleteAction(ActionEnumType.DELETE);
              }}
            >
              Yes, delete
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
          {fetcher.data?.message && <p className="">{fetcher.data?.message}</p>}
          <div className="flex items-center justify-right gap-4"></div>
        </div>
      ) : (
        <SuccessModalContent text="Scan deleted successfully!" />
      )}
    </Modal>
  );
};

const ActionDropdown = ({
  trigger,
  scanId,
  nodeId,
  scanStatus,
  nodeType,
  setShowDeleteDialog,
  setScanIdToDelete,
  setNodeIdToDelete,
}: {
  trigger: React.ReactNode;
  scanId: string;
  nodeId: string;
  scanStatus: string;
  nodeType: string;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setScanIdToDelete: React.Dispatch<React.SetStateAction<string>>;
  setNodeIdToDelete: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);
  const { downloadScan } = useDownloadScan();

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
          >
            <span
              className={cx('flex items-center gap-x-2', {
                'opacity-60 dark:opacity-30 cursor-default': !isScanComplete(scanStatus),
              })}
            >
              Download Report
            </span>
          </DropdownItem>
          <DropdownItem
            onClick={(e) => {
              if (!isScanComplete(scanStatus)) return;
              e.preventDefault();
              onDownloadAction();
            }}
            disabled
          >
            <span
              className={cx('flex items-center gap-x-2', {
                'opacity-60 dark:opacity-30 cursor-default': !isScanComplete(scanStatus),
              })}
            >
              Start scan
            </span>
          </DropdownItem>
          <DropdownItem
            className="text-sm"
            onClick={() => {
              setScanIdToDelete(scanId);
              setNodeIdToDelete(nodeId);
              setShowDeleteDialog(true);
            }}
          >
            <span className="text-red-700 dark:text-status-error dark:hover:text-[#C45268]">
              Delete
            </span>
          </DropdownItem>
        </>
      }
    >
      {trigger}
    </Dropdown>
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
                  {capitalize(item)}
                </ComboboxOption>
              );
            })}
        </Combobox>
        <Combobox
          value={SCAN_STATUS_GROUPS.find((groupStatus) => {
            return groupStatus.value === searchParams.get('secretScanStatus');
          })}
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

const ScansTable = () => {
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [scanIdToDelete, setScanIdToDelete] = useState('');
  const [nodeIdToDelete, setNodeIdToDelete] = useState('');

  const columnHelper = createColumnHelper<ScanResult>();

  const columns = useMemo(() => {
    const columns = [
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => (
          <ActionDropdown
            scanId={cell.row.original.scan_id}
            nodeId={cell.row.original.node_id}
            nodeType={cell.row.original.node_type}
            scanStatus={cell.row.original.status}
            setScanIdToDelete={setScanIdToDelete}
            setNodeIdToDelete={setNodeIdToDelete}
            setShowDeleteDialog={setShowDeleteDialog}
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
        cell: (info) => {
          const isNeverScan = isNeverScanned(info.row.original.status);
          if (isNeverScan) {
            return <TruncatedText text={info.getValue()} />;
          }
          return (
            <DFLink
              to={generatePath(`/secret/scan-results/:scanId`, {
                scanId: info.row.original.scan_id,
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
                  scanId: info.row.original.scan_id,
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
                  scanId: info.row.original.scan_id,
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
                  scanId: info.row.original.scan_id,
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
                  scanId: info.row.original.scan_id,
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
                  scanId: info.row.original.scan_id,
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
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          scanId={scanIdToDelete}
          nodeId={nodeIdToDelete}
          setShowDialog={setShowDeleteDialog}
        />
      )}
      <Table
        data={data.scans}
        columns={columns}
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
const SecretScans = () => {
  const [searchParams] = useSearchParams();

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const isFetching = useIsFetching({
    queryKey: queries.secret.scanList._def,
  });

  return (
    <div>
      <div className="flex pl-4 pr-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<SecretsIcon />} isLink>
            <DFLink to={'/secret'} unstyled>
              Secrets
            </DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink icon={<SecretsIcon />}>
            <span className="inherit cursor-auto">Secret Scans</span>
          </BreadcrumbLink>
        </Breadcrumb>

        <div className="ml-2 flex items-center">
          {isFetching ? <CircleSpinner size="sm" /> : null}
        </div>
      </div>

      <div className="mx-4">
        <div className="h-12 flex items-center">
          <Button
            variant="flat"
            className="ml-auto py-2"
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
          <ScansTable />
        </Suspense>
      </div>
    </div>
  );
};

export const module = {
  action,
  element: <SecretScans />,
};
