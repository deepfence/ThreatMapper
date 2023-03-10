import { useMemo, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  Modal,
  RowSelectionState,
  Table,
} from 'ui-components';

import { ModelContainerImageWithTags } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TableOptions } from '@/features/registries/components/common/TableOptions';

const ScanConfigure = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<string>>;
}) => {
  return (
    <Modal
      open={open}
      width="w-full"
      title="Configure your scan option"
      onOpenChange={() => setOpen('')}
    >
      <div className="p-4 pt-0"></div>
    </Modal>
  );
};

export const RegistryImageTable = ({ data }: { data: ModelContainerImageWithTags[] }) => {
  const [openScanConfigure, setOpenScanConfigure] = useState('');

  const columnHelper = createColumnHelper<ModelContainerImageWithTags>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  if (data === undefined) {
    return <div>No Images Found</div>;
  }
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
          // return {info.renderValue()} : <DFLink to={`./${info.renderValue()}`}> {info.renderValue()}</DFLink> ? <DFLink to={`./${info.renderValue()}`}> {info.renderValue()}</DFLink> : <DFLink to={`./${info.renderValue()}`}> {info.renderValue()}</DFLink>;
          // ternary operator
          return info.renderValue() ? (
            <DFLink to={`./${info.renderValue()}`}> {info.renderValue()}</DFLink>
          ) : (
            <></>
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
    return Object.keys(rowSelectionState).map((key) => key.split('<-->')[0]);
  }, [rowSelectionState]);

  return (
    <>
      {selectedIds.length === 0 ? (
        <div className="text-sm text-gray-400 font-medium py-2.5">No rows selected</div>
      ) : (
        <>
          <div className="mb-2 flex gap-x-2">
            <Dropdown
              content={
                <>
                  <DropdownItem
                    onClick={() => {
                      setOpenScanConfigure('vulnerability');
                    }}
                  >
                    <div className="w-4 h-4">
                      <VulnerabilityIcon />
                    </div>
                    Scan for Vulnerability
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      setOpenScanConfigure('secret');
                    }}
                  >
                    <div className="w-4 h-4">
                      <SecretsIcon />
                    </div>
                    Scan for Secret
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      setOpenScanConfigure('malware');
                    }}
                  >
                    <div className="w-4 h-4">
                      <MalwareIcon />
                    </div>
                    Scan for Malware
                  </DropdownItem>
                </>
              }
            >
              <Button size="xs" endIcon={<FaChevronDown />} outline>
                Scan selected
              </Button>
            </Dropdown>
          </div>
        </>
      )}
      <ScanConfigure open={openScanConfigure !== ''} setOpen={setOpenScanConfigure} />
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
    </>
  );
};
