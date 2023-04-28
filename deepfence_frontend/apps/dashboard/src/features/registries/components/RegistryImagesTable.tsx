import { useMemo, useState } from 'react';
import { FaPlay } from 'react-icons/fa';
import { generatePath, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  RowSelectionState,
  Table,
} from 'ui-components';

import { ModelImageStub } from '@/api/generated';
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import {
  MalwareScanNodeTypeEnum,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';

const PAGE_SIZE = 15;
export const RegistryImagesTable = ({
  data,
  pagination: { totalRows, currentPage },
}: {
  data: ModelImageStub[];
  pagination: {
    totalRows: number;
    currentPage: number;
  };
}) => {
  const { account, nodeId } = useParams() as {
    account: string;
    nodeId: string;
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedScanType, setSelectedScanType] = useState<
    | typeof ScanTypeEnum.VulnerabilityScan
    | typeof ScanTypeEnum.SecretScan
    | typeof ScanTypeEnum.MalwareScan
  >();

  const columnHelper = createColumnHelper<ModelImageStub>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelectionState);
  }, [rowSelectionState]);

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        size: 25,
        minSize: 10,
        maxSize: 25,
      }),
      columnHelper.accessor('name', {
        header: () => 'Image',
        cell: (info) => {
          return (
            <DFLink
              to={generatePath('/registries/imagetags/:account/:nodeId/:imageId', {
                account: account,
                nodeId,
                imageId: encodeURIComponent(info.row.original.name ?? ''),
              })}
            >
              {info.getValue()}
            </DFLink>
          );
        },
        minSize: 50,
      }),
      columnHelper.accessor('tags', {
        header: () => 'Total Tags',
        // count tags
        cell: (info) => info.getValue()?.length,
        maxSize: 50,
      }),
    ],
    [setSearchParams],
  );

  if (!account || !nodeId) {
    throw new Error('Account Type and Node Id are required');
  }
  if (data === undefined) {
    return <div>No Images Found</div>;
  }

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
            <Button size="xxs" color="primary" outline>
              Start scan
            </Button>
          </Dropdown>
        </div>
      )}
      <ConfigureScanModal
        open={!!selectedScanType}
        onOpenChange={() => setSelectedScanType(undefined)}
        scanOptions={
          selectedScanType
            ? getScanOptions(selectedScanType, [nodeId], selectedIds)
            : undefined
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
        getRowId={(row) => row.id || ''}
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
  images: string[],
): ConfigureScanModalProps['scanOptions'] {
  if (scanType === ScanTypeEnum.VulnerabilityScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodeIds,
        nodeType: VulnerabilityScanNodeTypeEnum.image,
        images,
      },
    };
  }

  if (scanType === ScanTypeEnum.SecretScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodeIds,
        nodeType: SecretScanNodeTypeEnum.image,
        images: [],
      },
    };
  }

  if (scanType === ScanTypeEnum.MalwareScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodeIds,
        nodeType: MalwareScanNodeTypeEnum.image,
        images: [],
      },
    };
  }

  throw new Error('invalid scan type');
}
