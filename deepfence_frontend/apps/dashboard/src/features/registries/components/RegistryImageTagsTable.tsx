import { useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import { HiDotsVertical } from 'react-icons/hi';
import { useSearchParams } from 'react-router-dom';
import {
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
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
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
              Start Vulnerability Scan
            </DropdownItem>
            <DropdownItem onClick={() => setSelectedScanType(ScanTypeEnum.SecretScan)}>
              <div className="w-4 h-4">
                <SecretsIcon />
              </div>
              Start Secret Scan
            </DropdownItem>
            <DropdownItem onClick={() => setSelectedScanType(ScanTypeEnum.MalwareScan)}>
              <div className="w-4 h-4">
                <MalwareIcon />
              </div>
              Start Malware Scan
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
          return formatMilliseconds(date * 1000);
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
        cell: (info) => <ScanStatusBadge status={info.getValue()} />,
        maxSize: 50,
      }),
      columnHelper.accessor('secret_scan_status', {
        header: () => 'Secrets Scan Status',
        cell: (info) => <ScanStatusBadge status={info.getValue()} />,
        maxSize: 50,
      }),
      columnHelper.accessor('malware_scan_status', {
        header: () => 'Malware Scan Status',
        cell: (info) => <ScanStatusBadge status={info.getValue()} />,
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
        <div className="text-sm text-gray-400 font-medium pb-3">No rows selected</div>
      ) : (
        <div className="mb-1.5">
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
            <Button size="xxs" outline color="primary">
              Start Scan
            </Button>
          </Dropdown>
        </div>
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
        approximatePagination
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
      showAdvancedOptions: nodeIds.length === 1,
      scanType,
      data: {
        nodeIds,
        nodeType: VulnerabilityScanNodeTypeEnum.imageTag,
      },
    };
  }

  if (scanType === ScanTypeEnum.SecretScan) {
    return {
      showAdvancedOptions: nodeIds.length === 1,
      scanType,
      data: {
        nodeIds,
        nodeType: SecretScanNodeTypeEnum.imageTag,
      },
    };
  }

  if (scanType === ScanTypeEnum.MalwareScan) {
    return {
      showAdvancedOptions: nodeIds.length === 1,
      scanType,
      data: {
        nodeIds,
        nodeType: MalwareScanNodeTypeEnum.imageTag,
      },
    };
  }

  throw new Error('invalid scan type');
}
