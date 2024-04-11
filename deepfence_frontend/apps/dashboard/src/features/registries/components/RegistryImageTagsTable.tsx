import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  RowSelectionState,
  SortingState,
  Table,
} from 'ui-components';

import { ModelContainerImage } from '@/api/generated';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { TruncatedText } from '@/components/TruncatedText';
import {
  ActionEnumType,
  RegistryScanType,
} from '@/features/registries/pages/RegistryImages';
import { useScanResults } from '@/features/registries/pages/RegistryImageTags';
import { ScanTypeEnum } from '@/types/common';
import { formatMilliseconds } from '@/utils/date';
import { formatMemory } from '@/utils/number';
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

export const RegistryImageTagsTable = ({
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
  const [searchParams, setSearchParams] = useSearchParams();
  const columnHelper = createColumnHelper<ModelContainerImage>();
  const [sort, setSort] = useSortingState();

  const { data } = useScanResults();
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
            throw new Error('Registry Image node id not found');
          }
          return (
            <ActionDropdown
              id={cell.row.original.node_id.split('<==>')[0]}
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
      columnHelper.accessor('docker_image_tag', {
        enableSorting: false,
        header: () => 'Image tag',
        cell: (info) => {
          return <TruncatedText text={info.getValue()} />;
        },
        maxSize: 40,
        minSize: 20,
      }),
      columnHelper.accessor('metadata', {
        enableSorting: false,
        header: () => 'Pushed at',
        cell: (info) => {
          const metadata = info.row.original.metadata;
          const date = metadata?.['last_updated'];
          if (date) {
            return formatMilliseconds(date * 1000);
          }
          return '-';
        },
        maxSize: 50,
      }),
      columnHelper.accessor('docker_image_size', {
        enableSorting: false,
        header: () => 'Size',
        cell: (info) => {
          if (!info.getValue().trim().length) return '-';
          return <TruncatedText text={formatMemory(parseInt(info.getValue(), 10))} />;
        },
        maxSize: 50,
      }),
      columnHelper.accessor('vulnerability_scan_status', {
        enableSorting: false,
        header: () => <TruncatedText text={'Vulnerability scan status'} />,
        cell: (info) => <ScanStatusBadge status={info.getValue()} />,
        maxSize: 50,
      }),
      columnHelper.accessor('secret_scan_status', {
        enableSorting: false,
        header: () => <TruncatedText text={'Secrets scan status'} />,
        cell: (info) => <ScanStatusBadge status={info.getValue()} />,
        maxSize: 50,
      }),
      columnHelper.accessor('malware_scan_status', {
        enableSorting: false,
        header: () => <TruncatedText text={'Malware scan status'} />,
        cell: (info) => <ScanStatusBadge status={info.getValue()} />,
        maxSize: 50,
      }),
    ],
    [setSearchParams],
  );

  return (
    <div className="self-start">
      <Table
        size="default"
        columns={columns}
        data={data.tags}
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
        getRowId={(row) => `${row.node_id}<==>${row.docker_image_tag}` || ''}
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
        enablePageResize
        onPageResize={(newSize) => {
          setSearchParams((prev) => {
            prev.set('size', String(newSize));
            prev.delete('page');
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
      />
    </div>
  );
};
