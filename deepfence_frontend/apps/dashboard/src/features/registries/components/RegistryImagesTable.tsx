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
import { DFLink } from '@/components/DFLink';
import {
  ActionEnumType,
  ScanConfigureModal,
} from '@/components/scan-configure-forms/ScanConfigureModal';
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
  const { account, accountId, nodeId } = useParams() as {
    account: string;
    nodeId: string;
    accountId: string;
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
              to={generatePath(
                '/registries/imagetags/:account/:accountId/:nodeId/:imageId',
                {
                  account: account,
                  nodeId,
                  accountId: accountId,
                  imageId: info.row.original.name ?? '',
                },
              )}
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

  if (!account || !accountId) {
    throw new Error('Account Type and Account Id are required');
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
                value={ActionEnumType.SCAN_VULNERABILITY}
                key={ActionEnumType.SCAN_VULNERABILITY}
              >
                <div className="w-4 h-4">
                  <VulnerabilityIcon />
                </div>
                Vulnerability
              </SelectItem>
              <SelectItem
                value={ActionEnumType.SCAN_SECRET}
                key={ActionEnumType.SCAN_SECRET}
              >
                <div className="w-4 h-4">
                  <SecretsIcon />
                </div>
                Secret
              </SelectItem>
              <SelectItem
                value={ActionEnumType.SCAN_MALWARE}
                key={ActionEnumType.SCAN_MALWARE}
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
      <ScanConfigureModal
        open={openScanConfigure !== ''}
        setOpen={setOpenScanConfigure}
        scanType={openScanConfigure}
        wantAdvanceOptions={true}
        data={{
          nodeIds: [nodeId], // registry node id
          nodeType: 'image',
          images: selectedIds, // selected images
        }}
      />
      <Table
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
