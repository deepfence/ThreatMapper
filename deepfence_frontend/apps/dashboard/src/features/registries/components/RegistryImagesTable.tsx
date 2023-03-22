import { useMemo, useState } from 'react';
import { generatePath, useParams, useSearchParams } from 'react-router-dom';
import {
  createColumnHelper,
  getRowSelectionColumn,
  RowSelectionState,
  Select,
  SelectItem,
  Table,
} from 'ui-components';

import { ModelImageStub } from '@/api/generated';
import { ConfigureScanModal } from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { MalwareScanActionEnumType } from '@/components/scan-configure-forms/MalwareScanConfigureForm';
import { SecretScanActionEnumType } from '@/components/scan-configure-forms/SecretScanConfigureForm';
import { VulnerabilityScanActionEnumType } from '@/components/scan-configure-forms/VulnerabilityScanConfigureForm';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';

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
  const [openScanConfigure, setOpenScanConfigure] = useState('');

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
                imageId: info.row.original.name ?? '',
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
    <div>
      {selectedIds.length === 0 ? (
        <div className="text-sm text-gray-400 font-medium py-2.5">No rows selected</div>
      ) : (
        <>
          <div className="mb-2 w-[160px]">
            <Select
              placeholder="Select a scan"
              value={openScanConfigure}
              sizing="xs"
              onChange={(value) => {
                setOpenScanConfigure(value);
              }}
            >
              <SelectItem
                value={VulnerabilityScanActionEnumType.SCAN_VULNERABILITY}
                key={VulnerabilityScanActionEnumType.SCAN_VULNERABILITY}
              >
                <div className="w-4 h-4">
                  <VulnerabilityIcon />
                </div>
                Vulnerability
              </SelectItem>
              <SelectItem
                value={SecretScanActionEnumType.SCAN_SECRET}
                key={SecretScanActionEnumType.SCAN_SECRET}
              >
                <div className="w-4 h-4">
                  <SecretsIcon />
                </div>
                Secret
              </SelectItem>
              <SelectItem
                value={MalwareScanActionEnumType.SCAN_MALWARE}
                key={MalwareScanActionEnumType.SCAN_MALWARE}
              >
                <div className="w-4 h-4">
                  <MalwareIcon />
                </div>
                Malware
              </SelectItem>
            </Select>
          </div>
        </>
      )}
      <ConfigureScanModal
        open={openScanConfigure !== ''}
        onOpenChange={() => setOpenScanConfigure('')}
        scanOptions={{
          scanType: openScanConfigure,
          showAdvancedOptions: true,
          nodeIds: [nodeId], // registry node id
          nodeType: 'image',
          images: selectedIds, // selected images
        }}
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
