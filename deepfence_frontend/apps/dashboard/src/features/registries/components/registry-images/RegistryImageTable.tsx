import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  getRowSelectionColumn,
  RowSelectionState,
  Table,
} from 'ui-components';

import { ModelContainerImageWithTags } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { TableOptions } from '@/features/registries/components/common/TableOptions';

export const RegistryImageTable = ({ data }: { data: ModelContainerImageWithTags[] }) => {
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
  return (
    <>
      <TableOptions selection={rowSelectionState} enableScanBy />
      <Table
        columns={columns}
        data={data}
        enablePagination
        enableRowSelection
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        enableSorting
        getRowId={(row) => row.name || ''}
      />
    </>
  );
};
