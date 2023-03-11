import { useMemo, useState } from 'react';
import { generatePath, useParams } from 'react-router-dom';
import {
  createColumnHelper,
  getRowSelectionColumn,
  RowSelectionState,
  Select,
  SelectItem,
  Table,
} from 'ui-components';

import { ModelContainerImageWithTags } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { ScanConfigureModal } from '@/components/registries-scan/ScanConfigureModal';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';

export const RegistryImagesTable = ({
  data,
}: {
  data: ModelContainerImageWithTags[];
}) => {
  const { account, accountId } = useParams() as {
    account: string;
    accountId: string;
  };
  const [openScanConfigure, setOpenScanConfigure] = useState('');

  const columnHelper = createColumnHelper<ModelContainerImageWithTags>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});

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
              to={generatePath('/registries/images/:account/:accountId/:imageId', {
                account: account,
                accountId: accountId,
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
    [],
  );

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelectionState);
  }, [rowSelectionState]);

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
              <SelectItem value={'vulnerability'} key={'scan_vulnerability'}>
                <div className="w-4 h-4">
                  <VulnerabilityIcon />
                </div>
                Vulnerability
              </SelectItem>
              <SelectItem value={'secret'} key={'scan_secret'}>
                <div className="w-4 h-4">
                  <SecretsIcon />
                </div>
                Secret
              </SelectItem>
              <SelectItem value={'malware'} key={'scan_malware'}>
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
          urlIds: selectedIds,
          urlType: 'registry',
        }}
      />
      <Table
        columns={columns}
        data={data}
        enablePagination
        enableRowSelection
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        enableSorting
        getRowId={(row) => row.id || ''}
      />
    </div>
  );
};
