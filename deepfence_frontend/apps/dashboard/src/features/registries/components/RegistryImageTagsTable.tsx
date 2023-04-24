import cx from 'classnames';
import { useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaPlay } from 'react-icons/fa';
import { HiDotsVertical } from 'react-icons/hi';
import { useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  RowSelectionState,
  Table,
} from 'ui-components';

import { ModelContainerImage } from '@/api/generated';
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import {
  MalwareScanNodeTypeEnum,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';
import { formatMilliseconds } from '@/utils/date';

const PAGE_SIZE = 15;

const ActionDropdown = ({ ids, label }: { ids: string[]; label?: string }) => {
  const [selectedScanType, setSelectedScanType] = useState<
    | typeof ScanTypeEnum.VulnerabilityScan
    | typeof ScanTypeEnum.SecretScan
    | typeof ScanTypeEnum.MalwareScan
  >();

  return (
    <>
      <ConfigureScanModal
        open={!!selectedScanType}
        onOpenChange={() => setSelectedScanType(undefined)}
        scanOptions={selectedScanType ? getScanOptions(selectedScanType, ids) : undefined}
      />
      <Dropdown
        triggerAsChild={true}
        align="end"
        content={
          <>
            <DropdownItem
              onClick={() => setSelectedScanType(ScanTypeEnum.VulnerabilityScan)}
            >
              <div className="w-4 h-4">
                <VulnerabilityIcon />
              </div>
              Scan for vulnerability
            </DropdownItem>
            <DropdownItem onClick={() => setSelectedScanType(ScanTypeEnum.SecretScan)}>
              <div className="w-4 h-4">
                <SecretsIcon />
              </div>
              Scan for secret
            </DropdownItem>
            <DropdownItem onClick={() => setSelectedScanType(ScanTypeEnum.MalwareScan)}>
              <div className="w-4 h-4">
                <MalwareIcon />
              </div>
              Scan for malware
            </DropdownItem>
          </>
        }
      >
        <Button size="xs" color="normal" className="hover:bg-transparent">
          <IconContext.Provider value={{ className: 'text-gray-700 dark:text-gray-400' }}>
            <HiDotsVertical />
          </IconContext.Provider>
          {label ? <span className="ml-2">{label}</span> : null}
        </Button>
      </Dropdown>
    </>
  );
};

export const RegistryImageTagsTable = ({
  data,
  pagination: { totalRows, currentPage },
}: {
  data: ModelContainerImage[];
  pagination: {
    totalRows: number;
    currentPage: number;
  };
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const columnHelper = createColumnHelper<ModelContainerImage>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});

  const [selectedScanType, setSelectedScanType] = useState<
    | typeof ScanTypeEnum.VulnerabilityScan
    | typeof ScanTypeEnum.SecretScan
    | typeof ScanTypeEnum.MalwareScan
  >();

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        size: 25,
        minSize: 10,
        maxSize: 25,
      }),
      columnHelper.accessor('docker_image_tag', {
        header: () => 'Image Tags',
        cell: (info) => {
          return info.renderValue();
        },
        maxSize: 40,
        minSize: 20,
      }),
      columnHelper.accessor('metadata', {
        header: () => 'Pushed at',
        cell: (info) => {
          const metadata = info.row.original.metadata;
          const date = metadata['last_updated'];
          return formatMilliseconds(date);
        },
        maxSize: 50,
      }),
      columnHelper.accessor('docker_image_size', {
        header: () => 'Size',
        cell: (info) => (Number(info.getValue()) / 1000000).toFixed(2) + ' MB',
        maxSize: 50,
      }),
      columnHelper.accessor('vulnerability_scan_status', {
        header: () => 'Vulnerability Scan Status',
        cell: (info) => (
          <Badge
            label={info.getValue().toUpperCase().replaceAll('_', ' ') || 'Not Scanned'}
            className={cx({
              'bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400':
                info.getValue().toLowerCase() === 'completed',
              'bg-red-100 dark:bg-red-600/10 text-red-600 dark:text-red-400':
                info.getValue().toLowerCase() === 'error',
              'bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400':
                info.getValue().toLowerCase() === 'in_progress',
              'bg-blue-100 dark:bg-blue-600/10 text-neutral-600 dark:text-neutral-400':
                info.getValue().toLowerCase() === '' ||
                info.getValue().toLowerCase() === 'not_scanned',
            })}
            size="sm"
          />
        ),
        maxSize: 50,
      }),
      columnHelper.accessor('malware_scan_status', {
        header: () => 'Malware Scan Status',
        cell: (info) => (
          <Badge
            label={info.getValue().toUpperCase().replaceAll('_', ' ') || 'Not Scanned'}
            className={cx({
              'bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400':
                info.getValue().toLowerCase() === 'completed',
              'bg-red-100 dark:bg-red-600/10 text-red-600 dark:text-red-400':
                info.getValue().toLowerCase() === 'error',
              'bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400':
                info.getValue().toLowerCase() === 'in_progress',
              'bg-blue-100 dark:bg-blue-600/10 text-neutral-600 dark:text-neutral-400':
                info.getValue().toLowerCase() === '' ||
                info.getValue().toLowerCase() === 'not_scanned',
            })}
            size="sm"
          />
        ),
        maxSize: 50,
      }),
      columnHelper.accessor('secret_scan_status', {
        header: () => 'Secrets Scan Status',
        cell: (info) => (
          <Badge
            label={info.getValue().toUpperCase().replaceAll('_', ' ') || 'Not Scanned'}
            className={cx({
              'bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400':
                info.getValue().toLowerCase() === 'completed',
              'bg-red-100 dark:bg-red-600/10 text-red-600 dark:text-red-400':
                info.getValue().toLowerCase() === 'error',
              'bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400':
                info.getValue().toLowerCase() === 'in_progress',
              'bg-blue-100 dark:bg-blue-600/10 text-neutral-600 dark:text-neutral-400':
                info.getValue().toLowerCase() === '' ||
                info.getValue().toLowerCase() === 'not_scanned',
            })}
            size="sm"
          />
        ),
        maxSize: 50,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          return <ActionDropdown ids={[cell.row.original.node_id]} />;
        },
        header: () => '',
        minSize: 20,
        size: 20,
        maxSize: 20,
        enableResizing: false,
      }),
    ],
    [setSearchParams],
  );

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelectionState);
  }, [rowSelectionState]);

  return (
    <div className="self-start">
      {selectedIds.length === 0 ? (
        <div className="text-sm text-gray-400 font-medium pb-2.5">No rows selected</div>
      ) : (
        <>
          <Dropdown
            triggerAsChild={true}
            align="start"
            content={
              <>
                <DropdownItem
                  onClick={() => setSelectedScanType(ScanTypeEnum.VulnerabilityScan)}
                >
                  <div className="w-4 h-4">
                    <VulnerabilityIcon />
                  </div>
                  Start Vulnerability Scan
                </DropdownItem>
                <DropdownItem
                  onClick={() => setSelectedScanType(ScanTypeEnum.SecretScan)}
                >
                  <div className="w-4 h-4">
                    <SecretsIcon />
                  </div>
                  Start Secret Scan
                </DropdownItem>
                <DropdownItem
                  onClick={() => setSelectedScanType(ScanTypeEnum.MalwareScan)}
                >
                  <div className="w-4 h-4">
                    <MalwareIcon />
                  </div>
                  Start Malware Scan
                </DropdownItem>
              </>
            }
          >
            <Button
              size="xs"
              color="normal"
              startIcon={<FaPlay />}
              className="text-blue-600 dark:text-blue-500"
            >
              Start scan
            </Button>
          </Dropdown>
        </>
      )}

      <ConfigureScanModal
        open={!!selectedScanType}
        onOpenChange={() => setSelectedScanType(undefined)}
        scanOptions={
          selectedScanType ? getScanOptions(selectedScanType, selectedIds) : undefined
        }
      />
      <Table
        size="sm"
        columns={columns}
        data={data}
        enableRowSelection
        rowSelectionState={rowSelectionState}
        enablePagination
        manualSorting
        manualPagination
        enableColumnResizing
        enableSorting
        totalRows={totalRows}
        pageSize={PAGE_SIZE}
        pageIndex={currentPage}
        getRowId={(row) => row.node_id || ''}
        onRowSelectionChange={setRowSelectionState}
        onPaginationChange={(updaterOrValue) => {
          let newPageIndex = 0;
          if (typeof updaterOrValue === 'function') {
            newPageIndex = updaterOrValue({
              pageIndex: currentPage,
              pageSize: PAGE_SIZE,
            }).pageIndex;
          } else {
            newPageIndex = updaterOrValue.pageIndex;
          }
          setSearchParams((prev) => {
            prev.set('page', String(newPageIndex));
            return prev;
          });
        }}
      />
    </div>
  );
};

function getScanOptions(
  scanType: ScanTypeEnum,
  nodeIds: string[],
): ConfigureScanModalProps['scanOptions'] {
  if (scanType === ScanTypeEnum.VulnerabilityScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodeIds,
        nodeType: VulnerabilityScanNodeTypeEnum.imageTag,
      },
    };
  }

  if (scanType === ScanTypeEnum.SecretScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodeIds,
        nodeType: SecretScanNodeTypeEnum.imageTag,
      },
    };
  }

  if (scanType === ScanTypeEnum.MalwareScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodeIds,
        nodeType: MalwareScanNodeTypeEnum.imageTag,
      },
    };
  }

  throw new Error('invalid scan type');
}
