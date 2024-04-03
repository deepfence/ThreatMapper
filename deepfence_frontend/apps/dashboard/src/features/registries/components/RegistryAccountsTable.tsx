import { useSuspenseQuery } from '@suspensive/react-query';
import { useMemo, useState } from 'react';
import { generatePath, useParams } from 'react-router-dom';
import {
  CircleSpinner,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  RowSelectionState,
  Table,
  TableNoDataElement,
} from 'ui-components';

import { ModelRegistryListResp } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { TruncatedText } from '@/components/TruncatedText';
import {
  ActionEnumType,
  RegistryScanType,
} from '@/features/registries/pages/RegistryAccounts';
import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';
import { formatMilliseconds } from '@/utils/date';

const DEFAULT_PAGE_SIZE = 10;

const useListRegistries = () => {
  return useSuspenseQuery({
    ...queries.registry.listRegistryAccounts(),
  });
};

const ActionDropdown = ({
  ids,
  trigger,
  setIdsToDelete,
  setShowDeleteDialog,
  onTableAction,
}: {
  ids: string[];
  trigger: React.ReactNode;
  setIdsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onTableAction: (id: string[], scanType: RegistryScanType, actionType: string) => void;
}) => {
  return (
    <Dropdown
      triggerAsChild={true}
      align={'start'}
      content={
        <>
          <DropdownItem
            onClick={() =>
              onTableAction(
                ids,
                ScanTypeEnum.VulnerabilityScan,
                ActionEnumType.START_SCAN,
              )
            }
          >
            Start Vulnerability Scan
          </DropdownItem>
          <DropdownItem
            onClick={() =>
              onTableAction(ids, ScanTypeEnum.SecretScan, ActionEnumType.START_SCAN)
            }
          >
            Start Secret Scan
          </DropdownItem>
          <DropdownItem
            onClick={() =>
              onTableAction(ids, ScanTypeEnum.MalwareScan, ActionEnumType.START_SCAN)
            }
          >
            Start Malware Scan
          </DropdownItem>
          <DropdownItem
            onClick={(e) => {
              e.preventDefault();
              onTableAction(ids, '' as RegistryScanType, ActionEnumType.SYNC_IMAGES);
            }}
          >
            Sync Images
          </DropdownItem>
          <DropdownItem
            onClick={() => {
              setIdsToDelete(ids);
              setShowDeleteDialog(true);
            }}
            color="error"
          >
            Delete
          </DropdownItem>
        </>
      }
    >
      {trigger}
    </Dropdown>
  );
};

export const RegistryAccountsTable = ({
  rowSelectionState,
  onTableAction,
  setIdsToDelete,
  setShowDeleteDialog,
  setRowSelectionState,
}: {
  rowSelectionState: RowSelectionState;
  onTableAction: (id: string[], scanType: RegistryScanType, actionType: string) => void;
  setIdsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}) => {
  const { data } = useListRegistries();
  const { account } = useParams() as {
    account: string;
  };
  const registriesOfAccountType =
    data?.accounts.filter((registry) => registry.registry_type === account) ?? [];
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const columnHelper = createColumnHelper<ModelRegistryListResp>();
  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        size: 15,
        minSize: 15,
        maxSize: 15,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          if (!cell.row.original.node_id) {
            throw new Error('Registry Account node id not found');
          }
          return (
            <ActionDropdown
              ids={[cell.row.original.node_id.toString()]}
              setIdsToDelete={setIdsToDelete}
              setShowDeleteDialog={setShowDeleteDialog}
              onTableAction={onTableAction}
              trigger={
                <button className="p-1">
                  <div className="h-[16px] w-[16px] text-text-text-and-icon rotate-90">
                    <EllipsisIcon />
                  </div>
                </button>
              }
            />
          );
        },
        header: () => '',
        minSize: 20,
        size: 20,
        maxSize: 20,
        enableResizing: false,
      }),
      columnHelper.accessor('name', {
        header: () => 'Name',
        cell: (info) => (
          <div>
            <DFLink
              to={generatePath('/registries/images/:account/:nodeId', {
                account: encodeURIComponent(account),
                nodeId: encodeURIComponent(info.row.original.node_id ?? ''),
              })}
            >
              {info.getValue()}
            </DFLink>
          </div>
        ),
        minSize: 100,
        size: 110,
        maxSize: 120,
      }),
      columnHelper.accessor('is_syncing', {
        header: () => 'Sync status',
        cell: (info) => (
          <>
            {info.getValue() === true ? (
              <span className="flex items-center gap-1.5 text-text-text-and-icon text-p4">
                <CircleSpinner size="sm" />
                Syncing
              </span>
            ) : (
              'Ready to scan'
            )}
          </>
        ),
        minSize: 100,
        size: 110,
        maxSize: 120,
      }),
      columnHelper.accessor('created_at', {
        enableSorting: true,
        header: () => 'Created',
        minSize: 100,
        size: 110,
        maxSize: 120,
        cell: (info) => {
          const date = info.getValue();
          if (date !== undefined) {
            return formatMilliseconds(date * 1000);
          }
          return '';
        },
      }),
      columnHelper.accessor('non_secret', {
        enableSorting: false,
        header: () => 'Credentials',
        cell: (info) => <TruncatedText text={JSON.stringify(info.getValue())} />,
        minSize: 120,
        size: 130,
        maxSize: 140,
      }),
    ],
    [],
  );
  return (
    <div className="self-start">
      <Table
        getRowId={(row) => row.node_id || ''}
        enableRowSelection
        columns={columns}
        data={registriesOfAccountType}
        enableSorting
        size="default"
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        enablePagination
        pageSize={pageSize}
        enablePageResize
        onPageResize={(newSize) => {
          setPageSize(newSize);
        }}
        noDataElement={
          <TableNoDataElement text="No registries found, please add new registry" />
        }
      />
    </div>
  );
};
