import { useMemo, useState } from 'react';
import { LoaderFunctionArgs } from 'react-router-dom';
import {
  createColumnHelper,
  getRowExpanderColumn,
  getRowSelectionColumn,
  RowSelectionState,
  Table,
} from 'ui-components';

const loader = ({ request }: LoaderFunctionArgs) => {
  return null;
};

function TopologyCloudTable() {
  const columnHelper = createColumnHelper<{ id: string; name: string }>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});

  const columns = useMemo(
    () => [
      getRowExpanderColumn(columnHelper),
      getRowSelectionColumn(columnHelper, {
        size: 100,
        minSize: 100,
        maxSize: 100,
      }),
      columnHelper.accessor('id', {
        cell: (info) => info.getValue(),
        header: () => 'ID',
        size: 1500,
        minSize: 1000,
        maxSize: 2000,
      }),
      columnHelper.accessor((row) => row.name, {
        id: 'name',
        cell: (info) => info.getValue(),
        header: () => <span>Name</span>,
        size: 1500,
        minSize: 1000,
        maxSize: 2000,
      }),
    ],
    [],
  );

  const data = useMemo(() => {
    const data: { id: string; name: string }[] = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        id: String(i),
        name: `Fruit ${i}`,
      });
    }
    return data;
  }, []);
  return (
    <>
      <Table
        size="sm"
        data={data}
        columns={columns}
        enableSorting
        enableRowSelection
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
      />
    </>
  );
}

export const module = {
  loader,
  element: <TopologyCloudTable />,
};
