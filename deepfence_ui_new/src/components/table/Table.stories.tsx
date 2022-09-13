import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useMemo } from 'react';

import { createColumnHelper, RowExpander, Table } from './Table';

export default {
  title: 'Components/Table',
  component: Table,
} as ComponentMeta<typeof Table>;

type Fruit = {
  id: number;
  name: string;
  taste: string;
};

const Template: ComponentStory<typeof Table<Fruit>> = (args) => {
  const columnHelper = createColumnHelper<Fruit>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        cell: (info) => info.getValue(),
        header: () => 'ID',
      }),
      columnHelper.accessor((row) => row.name, {
        id: 'name',
        cell: (info) => info.getValue(),
        header: () => <span>Name</span>,
      }),
      columnHelper.accessor('taste', {
        header: () => 'Taste',
        cell: (info) => info.renderValue(),
      }),
    ],
    [],
  );
  return (
    <Table
      {...args}
      data={[
        {
          id: 1,
          name: 'Apple',
          taste: 'Apply',
        },
        {
          id: 2,
          name: 'Peach',
          taste: 'Peachy',
        },
        {
          id: 3,
          name: 'Pineapple',
          taste: 'Sweet!',
        },
      ]}
      columns={columns}
    />
  );
};

export const Default = Template.bind({});
Default.args = {};

export const StripedTable = Template.bind({});
StripedTable.args = {
  striped: true,
};

const TemplateWithSubcomponent: ComponentStory<typeof Table<Fruit>> = (args) => {
  const columnHelper = createColumnHelper<Fruit>();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'expander',
        header: () => null,
        cell: ({ row }) => {
          return <RowExpander row={row} />;
        },
        minSize: 0,
        size: 10,
        maxSize: 10,
      }),
      columnHelper.accessor('id', {
        cell: (info) => info.getValue(),
        header: () => 'ID',
      }),
      columnHelper.accessor((row) => row.name, {
        id: 'name',
        cell: (info) => info.getValue(),
        header: () => <span>Name</span>,
      }),
      columnHelper.accessor('taste', {
        header: () => 'Taste',
        cell: (info) => info.renderValue(),
      }),
    ],
    [],
  );
  return (
    <Table
      {...args}
      data={[
        {
          id: 1,
          name: 'Apple',
          taste: 'Apply',
        },
        {
          id: 2,
          name: 'Peach',
          taste: 'Peachy',
        },
        {
          id: 3,
          name: 'Pineapple',
          taste: 'Sweet!',
        },
      ]}
      columns={columns}
      getRowCanExpand={() => {
        return true;
      }}
      renderSubComponent={({ row }) => {
        return (
          <pre className="dark:text-gray-200">
            {JSON.stringify(row.original, null, 2)}
          </pre>
        );
      }}
    />
  );
};

export const DefaultWithSubcomponent = TemplateWithSubcomponent.bind({});
DefaultWithSubcomponent.args = {};

export const StripedWithSubcomponent = TemplateWithSubcomponent.bind({});
StripedWithSubcomponent.args = {
  striped: true,
};
