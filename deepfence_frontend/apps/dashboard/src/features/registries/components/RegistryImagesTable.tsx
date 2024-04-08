import { useMemo } from 'react';
import { generatePath, useParams, useSearchParams } from 'react-router-dom';
import {
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  RowSelectionState,
  SortingState,
  Table,
} from 'ui-components';

import { ModelImageStub } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import {
  ActionEnumType,
  RegistryScanType,
  useListImages,
} from '@/features/registries/pages/RegistryImages';
import { ScanTypeEnum } from '@/types/common';
import { useSortingState } from '@/utils/table';

const DEFAULT_PAGE_SIZE = 10;

const ActionDropdown = ({
  id,
  trigger,
  onTableAction,
}: {
  id: string;
  trigger: React.ReactNode;
  onTableAction: (
    ids: string[],
    scanType: RegistryScanType,
    actionType: ActionEnumType,
  ) => void;
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
                [id],
                ScanTypeEnum.VulnerabilityScan,
                ActionEnumType.START_SCAN,
              )
            }
          >
            Start Vulnerability Scan
          </DropdownItem>
          <DropdownItem
            onClick={() =>
              onTableAction([id], ScanTypeEnum.SecretScan, ActionEnumType.START_SCAN)
            }
          >
            Start Secret Scan
          </DropdownItem>
          <DropdownItem
            onClick={() =>
              onTableAction([id], ScanTypeEnum.MalwareScan, ActionEnumType.START_SCAN)
            }
          >
            Start Malware Scan
          </DropdownItem>
        </>
      }
    >
      {trigger}
    </Dropdown>
  );
};

export const RegistryImagesTable = ({
  rowSelectionState,
  setRowSelectionState,
  onTableAction,
}: {
  onTableAction: (
    ids: string[],
    scanType: RegistryScanType,
    actionType: ActionEnumType,
  ) => void;
  rowSelectionState: RowSelectionState;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}) => {
  const { account, nodeId } = useParams() as {
    account: string;
    nodeId: string;
  };
  const { data } = useListImages();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sort, setSort] = useSortingState();

  const columnHelper = createColumnHelper<ModelImageStub>();

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        size: 10,
        minSize: 10,
        maxSize: 10,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          if (!cell.row.original.id) {
            throw new Error('Registry Account node id not found');
          }
          return (
            <ActionDropdown
              id={cell.row.original.id}
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
        enableSorting: false,
        header: () => 'Image',
        cell: (info) => {
          return (
            <DFLink
              to={generatePath('/registries/imagetags/:account/:nodeId/:imageId', {
                account: encodeURIComponent(account),
                nodeId: encodeURIComponent(nodeId),
                imageId: encodeURIComponent(info.row.original.name ?? ''),
              })}
            >
              {info.getValue()}
            </DFLink>
          );
        },
        minSize: 50,
      }),
      columnHelper.accessor('images', {
        enableSorting: false,
        header: () => 'Total images',
        cell: (info) => info.getValue() ?? 0,
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
      <Table
        size="default"
        columns={columns}
        data={data.images}
        enableRowSelection
        rowSelectionState={rowSelectionState}
        enablePagination
        manualSorting
        manualPagination
        enableColumnResizing
        enableSorting
        approximatePagination
        totalRows={data.totalRows}
        pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
        pageIndex={data.currentPage}
        getRowId={(row) => row.id || ''}
        onRowSelectionChange={setRowSelectionState}
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
    </div>
  );
};
