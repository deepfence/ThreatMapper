import '@testing-library/jest-dom';

import { fireEvent, waitFor } from '@testing-library/react';

import { renderWithClient } from '../../tests/utils';
import { getRowExpanderColumn, Table, TableProps } from './Table';

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
    const { getByRole, getAllByTestId, getAllByRole } = renderWithClient(<BasicTable />);
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
    fireEvent.mouseOver(rows[2]);

    await waitFor(() => {
      expect(rows[2]).toMatchSnapshot('row with hover state on normal table');
    });
  });

  it('should render a striped table', async () => {
    const { getByRole, getAllByTestId, getAllByRole } = renderWithClient(
      <BasicTable
        tableProps={{
          striped: true,
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
    expect(rows[1]).toMatchSnapshot('odd rows should have lighter background');
    expect(rows[2]).toMatchSnapshot('even rows should have darker background');
    expect(cells[1]).toMatchSnapshot(`cells should not have border`);

    fireEvent.mouseOver(rows[2]);

    await waitFor(() => {
      expect(rows[2]).toMatchSnapshot('row with hover state on striped table');
    });
  });

  it('expandable rows should expand correctly', async () => {
    const { getAllByRole, getByText, queryByText } = renderWithClient(
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

    fireEvent.click(expanderButtons[1]);

    await waitFor(() => {
      expect(getByText('row id 2')).toBeInTheDocument();
    });
  });

  it('table with auto pagination should work', async () => {
    const { getByTestId, getByRole, queryByText, rerender } = renderWithClient(
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
    expect(getByRole('button', { name: /next/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(getByRole('cell', { name: /fruit 0/i })).toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: /2/i }));

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
});
