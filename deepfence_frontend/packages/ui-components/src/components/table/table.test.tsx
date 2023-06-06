import '@testing-library/jest-dom';

import { RowSelectionState, SortingState } from '@tanstack/react-table';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sortBy } from 'lodash-es';
import { useMemo, useState } from 'react';

import {
  getRowExpanderColumn,
  getRowSelectionColumn,
  Table,
  TableProps,
} from '@/components/table/Table';
import { renderUI } from '@/tests/utils';

interface Fruit {
  id: number;
  name: string;
  description: string;
}

function createDummyFruitData(length = 2) {
  const data: Fruit[] = [];
  for (let i = 0; i < length; i++) {
    data.push({
      id: i,
      name: `Fruit ${i}`,
      description: `Description for ${i}`,
    });
  }
  return data;
}

const defaultColumns = [
  {
    accessorKey: 'id',
  },
  {
    accessorKey: 'name',
  },
  {
    accessorKey: 'description',
    enableResizing: false,
  },
];

const BasicTable = ({
  dataLength,
  tableProps,
}: {
  dataLength?: number;
  tableProps?: Partial<TableProps<Fruit>>;
}) => {
  return (
    <Table
      data={createDummyFruitData(dataLength)}
      columns={defaultColumns}
      {...tableProps}
    />
  );
};

describe(`Component Table`, () => {
  it('should render a basic table', async () => {
    const user = userEvent.setup();
    const { getByRole, getAllByTestId, getAllByRole } = renderUI(<BasicTable />);
    expect(getByRole('table')).toBeInTheDocument();
    expect(getAllByTestId('table-header-row').length).toEqual(1);
    expect(getAllByRole('columnheader').length).toEqual(3);
    const rows = getAllByRole('row');
    expect(rows.length).toEqual(3);
    const cells = getAllByRole('cell');
    expect(cells.length).toEqual(6);
    cells.forEach((cell, index) => {
      if (index < 3) {
        expect(cell.outerHTML).toMatchSnapshot(`cells with border ${index}`);
      } else {
        expect(cell.outerHTML).toMatchSnapshot(`cells without border ${index}`);
      }
    });
    await user.hover(rows[2]);

    await waitFor(() => {
      expect(rows[2]).toMatchSnapshot('row with hover state on normal table');
    });
  });

  it('expandable rows should expand correctly', async () => {
    const user = userEvent.setup();
    const { getAllByRole, getByText, queryByText } = renderUI(
      <BasicTable
        dataLength={5}
        tableProps={{
          renderSubComponent: ({ row }) => {
            return <div>row id {row.original.id}</div>;
          },
          getRowCanExpand: (row) => {
            return row.index !== 0;
          },
          columns: [getRowExpanderColumn<Fruit>(), ...defaultColumns],
        }}
      />,
    );
    const expanderButtons = getAllByRole('button');
    expect(expanderButtons.length).toEqual(4);

    expect(queryByText('row id 2')).not.toBeInTheDocument();

    await user.click(expanderButtons[1]);

    await waitFor(() => {
      expect(getByText('row id 2')).toBeInTheDocument();
    });
  });

  it('table with auto pagination should work', async () => {
    const user = userEvent.setup();
    const { getByTestId, getByRole, queryByText, rerender } = renderUI(
      <BasicTable
        dataLength={100}
        tableProps={{
          enablePagination: true,
          pageSize: 20,
        }}
      />,
    );

    expect(getByTestId('pagination-container')).toBeInTheDocument();
    expect(getByRole('button', { name: /1/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /5/i })).toBeInTheDocument();
    expect(getByTestId('pagination-next')).toBeInTheDocument();
    expect(getByTestId('pagination-prev')).toBeInTheDocument();
    expect(getByRole('cell', { name: /fruit 0/i })).toBeInTheDocument();

    await user.click(getByRole('button', { name: /2/i }));

    await waitFor(() => {
      expect(queryByText('fruit 0')).not.toBeInTheDocument();
      expect(getByRole('cell', { name: /fruit 20/i })).toBeInTheDocument();
    });

    rerender(
      <BasicTable
        dataLength={100}
        tableProps={{
          enablePagination: true,
          pageSize: 10,
        }}
      />,
    );

    await waitFor(() => {
      expect(getByRole('button', { name: /10/i })).toBeInTheDocument();
    });
  });

  it('table with manual pagination should work', async () => {
    const user = userEvent.setup();

    const ManualPaginationTable = () => {
      const [{ pageIndex, pageSize }, setPagination] = useState({
        pageIndex: 0,
        pageSize: 20,
      });
      const data = useMemo(() => {
        const data = createDummyFruitData(995);
        return data.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
      }, [pageIndex]);

      return (
        <Table
          data={data}
          columns={defaultColumns}
          enablePagination
          manualPagination
          pageSize={pageSize}
          pageIndex={pageIndex}
          totalRows={995}
          onPaginationChange={setPagination}
        />
      );
    };

    const { getByTestId, getByRole, queryByText } = renderUI(<ManualPaginationTable />);

    expect(getByTestId('pagination-container')).toBeInTheDocument();
    expect(getByRole('button', { name: /1/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /50/i })).toBeInTheDocument();
    expect(getByTestId('pagination-next')).toBeInTheDocument();
    expect(getByTestId('pagination-prev')).toBeInTheDocument();
    expect(getByRole('cell', { name: /fruit 0/i })).toBeInTheDocument();

    await user.click(getByRole('button', { name: /2/i }));

    await waitFor(() => {
      expect(queryByText('fruit 0')).not.toBeInTheDocument();
      expect(getByRole('cell', { name: /fruit 20/i })).toBeInTheDocument();
    });
  });

  it('resizable table should show resize handlers on headers', () => {
    const { getByTestId, queryByTestId } = renderUI(
      <BasicTable
        dataLength={10}
        tableProps={{
          enableColumnResizing: true,
        }}
      />,
    );
    expect(getByTestId('column-resizer-id')).toBeInTheDocument();
    expect(getByTestId('column-resizer-name')).toBeInTheDocument();
    expect(queryByTestId('column-resizer-description')).not.toBeInTheDocument();
  });

  it('table with automatic sorting should work correctly', async () => {
    const user = userEvent.setup();
    const { getAllByRole, getByRole, getByTestId, queryByTestId } = renderUI(
      <BasicTable
        dataLength={100}
        tableProps={{
          enableSorting: true,
          enablePagination: true,
          pageSize: 10,
        }}
      />,
    );
    const rows = getAllByRole('row');
    expect(rows.length).toEqual(11);
    expect(rows[1].children.item(0)?.textContent).toEqual('0');
    expect(rows[10].children.item(0)?.textContent).toEqual('9');
    expect(getByTestId('column-unsorted-indicator-id')).toBeInTheDocument();
    await user.click(getByRole('columnheader', { name: /id/i }));

    await waitFor(() => {
      const rows = getAllByRole('row');
      expect(queryByTestId('column-unsorted-indicator-id')).not.toBeInTheDocument();
      expect(queryByTestId('column-ascending-indicator-id')).not.toBeInTheDocument();
      expect(getByTestId('column-descending-indicator-id')).toBeInTheDocument();
      expect(rows.length).toEqual(11);
      expect(rows[1].children.item(0)?.textContent).toEqual('99');
      expect(rows[10].children.item(0)?.textContent).toEqual('90');
    });

    await user.click(getByRole('columnheader', { name: /id/i }));

    await waitFor(() => {
      const rows = getAllByRole('row');
      expect(queryByTestId('column-unsorted-indicator-id')).not.toBeInTheDocument();
      expect(queryByTestId('column-descending-indicator-id')).not.toBeInTheDocument();
      expect(getByTestId('column-ascending-indicator-id')).toBeInTheDocument();
      expect(rows.length).toEqual(11);
      expect(rows[1].children.item(0)?.textContent).toEqual('0');
      expect(rows[10].children.item(0)?.textContent).toEqual('9');
    });

    await user.click(getByRole('columnheader', { name: /id/i }));

    await waitFor(() => {
      const rows = getAllByRole('row');
      expect(queryByTestId('column-ascending-indicator-id')).not.toBeInTheDocument();
      expect(queryByTestId('column-descending-indicator-id')).not.toBeInTheDocument();
      expect(getByTestId('column-unsorted-indicator-id')).toBeInTheDocument();
      expect(rows.length).toEqual(11);
      expect(rows[1].children.item(0)?.textContent).toEqual('0');
      expect(rows[10].children.item(0)?.textContent).toEqual('9');
    });
  });

  it('table with manual sorting should work correctly', async () => {
    const user = userEvent.setup();
    const ManualSortedTable = () => {
      const [{ pageIndex, pageSize }, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
      });
      const [sort, setSort] = useState<SortingState>([]);
      const data = useMemo(() => {
        let data = createDummyFruitData(100);
        if (sort.length) {
          data = sortBy(data, [sort[0].id]);
          if (sort[0].desc) {
            data.reverse();
          }
        }
        return data.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
      }, [pageIndex, sort]);

      return (
        <Table
          data={data}
          columns={defaultColumns}
          enablePagination
          manualPagination
          pageSize={pageSize}
          pageIndex={pageIndex}
          totalRows={100}
          onPaginationChange={setPagination}
          enableSorting
          manualSorting
          sortingState={sort}
          onSortingChange={setSort}
        />
      );
    };
    const { getAllByRole, getByRole, getByTestId, queryByTestId } = renderUI(
      <ManualSortedTable />,
    );
    const rows = getAllByRole('row');
    expect(rows.length).toEqual(11);
    expect(rows[1].children.item(0)?.textContent).toEqual('0');
    expect(rows[10].children.item(0)?.textContent).toEqual('9');
    expect(getByTestId('column-unsorted-indicator-id')).toBeInTheDocument();
    await user.click(getByRole('columnheader', { name: /id/i }));

    await waitFor(() => {
      const rows = getAllByRole('row');
      expect(queryByTestId('column-unsorted-indicator-id')).not.toBeInTheDocument();
      expect(queryByTestId('column-ascending-indicator-id')).not.toBeInTheDocument();
      expect(getByTestId('column-descending-indicator-id')).toBeInTheDocument();
      expect(rows.length).toEqual(11);
      expect(rows[1].children.item(0)?.textContent).toEqual('99');
      expect(rows[10].children.item(0)?.textContent).toEqual('90');
    });

    await user.click(getByRole('columnheader', { name: /id/i }));

    await waitFor(() => {
      const rows = getAllByRole('row');
      expect(queryByTestId('column-unsorted-indicator-id')).not.toBeInTheDocument();
      expect(queryByTestId('column-descending-indicator-id')).not.toBeInTheDocument();
      expect(getByTestId('column-ascending-indicator-id')).toBeInTheDocument();
      expect(rows.length).toEqual(11);
      expect(rows[1].children.item(0)?.textContent).toEqual('0');
      expect(rows[10].children.item(0)?.textContent).toEqual('9');
    });

    await user.click(getByRole('columnheader', { name: /id/i }));

    await waitFor(() => {
      const rows = getAllByRole('row');
      expect(queryByTestId('column-ascending-indicator-id')).not.toBeInTheDocument();
      expect(queryByTestId('column-descending-indicator-id')).not.toBeInTheDocument();
      expect(getByTestId('column-unsorted-indicator-id')).toBeInTheDocument();
      expect(rows.length).toEqual(11);
      expect(rows[1].children.item(0)?.textContent).toEqual('0');
      expect(rows[10].children.item(0)?.textContent).toEqual('9');
    });
  });

  it('table with row selection enabled should work correctly', async () => {
    const user = userEvent.setup();
    const TableWithRowSelection = () => {
      const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
      return (
        <>
          <div data-testid="selected-rows">
            {Object.keys(rowSelectionState)
              .map((id) => `"${id}"`)
              .join(', ')}
          </div>
          <BasicTable
            dataLength={10}
            tableProps={{
              columns: [getRowSelectionColumn(), ...defaultColumns],
              enableSorting: true,
              enablePagination: true,
              pageSize: 10,
              enableRowSelection: true,
              rowSelectionState,
              onRowSelectionChange: setRowSelectionState,
              getRowId: ({ id }) => {
                return `id-${id}`;
              },
            }}
          />
        </>
      );
    };
    const { getAllByRole, getByTestId } = renderUI(<TableWithRowSelection />);

    let [selectAllCheckBox, ...checkboxes] = getAllByRole('checkbox');
    expect(selectAllCheckBox).toBeInTheDocument();
    expect(checkboxes.length).toEqual(10);
    expect(getByTestId('selected-rows')).toHaveTextContent('');

    await user.click(checkboxes[4]);

    await waitFor(() => {
      expect(getByTestId('selected-rows').textContent).toContain(`"id-4"`);
    });

    [selectAllCheckBox, ...checkboxes] = getAllByRole('checkbox');
    await user.click(checkboxes[5]);

    await waitFor(() => {
      expect(getByTestId('selected-rows').textContent).toContain(`"id-4"`);
      expect(getByTestId('selected-rows').textContent).toContain(`"id-5"`);
    });

    [selectAllCheckBox, ...checkboxes] = getAllByRole('checkbox');
    await user.click(selectAllCheckBox);

    await waitFor(() => {
      checkboxes.slice(checkboxes.length - 1).forEach((checkbox, index) => {
        expect(getByTestId('selected-rows').textContent).toContain(`"id-${index}"`);
      });
    });
  });

  it('should use getTrProps and getTdProps correctly', async () => {
    const { getByRole, getAllByTestId, getAllByRole } = renderUI(
      <BasicTable
        tableProps={{
          getTdProps: () => {
            return {
              className: 'text-red-500',
            };
          },
          getTrProps: () => {
            return {
              className: 'bg-red-500',
            };
          },
        }}
      />,
    );
    expect(getByRole('table')).toBeInTheDocument();
    expect(getAllByTestId('table-header-row').length).toEqual(1);
    expect(getAllByRole('columnheader').length).toEqual(3);
    const rows = getAllByRole('row');
    expect(rows.length).toEqual(3);
    const cells = getAllByRole('cell');
    expect(cells.length).toEqual(6);
    rows.forEach((row, index) => {
      expect(row.outerHTML).toMatchSnapshot(`row with custom props${index}`);
    });
    cells.forEach((cell, index) => {
      expect(cell.outerHTML).toMatchSnapshot(`cells with custom props ${index}`);
    });
  });
});
