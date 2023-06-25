import { useMemo } from 'react';
import { generatePath, useParams, useSearchParams } from 'react-router-dom';
import {
  createColumnHelper,
  getRowSelectionColumn,
  RowSelectionState,
  Table,
} from 'ui-components';

import { ModelImageStub } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import {
  ActionEnumType,
  RegistryScanType,
  useListImages,
} from '@/features/registries/pages/RegistryImages';

const DEFAULT_PAGE_SIZE = 10;

export const RegistryImagesTable = ({
  rowSelectionState,
  setRowSelectionState,
}: {
  onTableAction: (
    nodeIds: string[],
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

  const columnHelper = createColumnHelper<ModelImageStub>();

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
      />
    </div>
  );
};
