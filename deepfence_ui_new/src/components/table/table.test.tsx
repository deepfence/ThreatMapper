import '@testing-library/jest-dom';

import { renderWithClient } from '../../tests/utils';
import { Table, TableProps } from './Table';

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
      description: `Description for fruit ${i}`,
    });
  }
  return data;
}

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
      columns={[
        {
          accessorKey: 'id',
        },
        {
          accessorKey: 'name',
        },
        {
          accessorKey: 'description',
        },
      ]}
      {...tableProps}
    />
  );
};

describe(`Component Table`, () => {
  it('should render a basic table', () => {
    const { getByRole, getAllByTestId, getAllByRole } = renderWithClient(<BasicTable />);
    expect(getByRole('table')).toBeInTheDocument();
    expect(getAllByTestId('table-header-row').length).toEqual(1);
    expect(getAllByRole('columnheader').length).toEqual(3);
    expect(getAllByRole('row').length).toEqual(3);
    const cells = getAllByRole('cell');
    expect(cells.length).toEqual(6);
  });
});
