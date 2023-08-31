import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { RowSelectionState, SortingState } from '@tanstack/react-table';
import { sortBy } from 'lodash-es';
import { useMemo, useRef, useState } from 'react';

import {
  createColumnHelper,
  getRowExpanderColumn,
  getRowSelectionColumn,
  Table,
  TableInstance,
} from '@/components/table/Table';
import { TableSkeleton } from '@/components/table/TableSkeleton';

export default {
  title: 'Components/Table',
  component: Table,
} satisfies Meta<typeof Table>;

type Fruit = {
  id: number;
  name: string;
  taste: string;
};

const Template: StoryFn<typeof Table<Fruit>> = (args) => {
  const columnHelper = createColumnHelper<Fruit>();

  const checkboxRow = getRowSelectionColumn(columnHelper, {
    size: 100,
    minSize: 100,
    maxSize: 100,
  });
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
      columnHelper.display({
        id: 'custom1',
        header: () => 'Color',
        cell: () => 'Red',
      }),
      columnHelper.display({
        id: 'custom2',
        header: () => 'Nutritious',
        cell: () => 'Very',
      }),
      columnHelper.display({
        id: 'custom3',
        header: () => 'Shape',
        cell: () => 'Round',
      }),
      columnHelper.display({
        id: 'custom4',
        header: () => 'Availability',
        cell: () => 'Easily available',
      }),
    ],
    [],
  );
  if (args.enableRowSelection) {
    columns.unshift(checkboxRow);
  }
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

export const DefaultTable: StoryObj<typeof Table<Fruit>> = {
  render: Template,
  args: {},
};

export const CompactTable: StoryObj<typeof Table<Fruit>> = {
  render: Template,

  args: {
    size: 'compact',
  },
};

export const MediumTable: StoryObj<typeof Table<Fruit>> = {
  render: Template,

  args: {
    size: 'medium',
  },
};

export const RelaxedTable: StoryObj<typeof Table<Fruit>> = {
  render: Template,

  args: {
    size: 'relaxed',
  },
};

const TemplateWithSubcomponent: StoryFn<typeof Table<Fruit>> = (args) => {
  const columnHelper = createColumnHelper<Fruit>();

  const columns = useMemo(
    () => [
      getRowExpanderColumn(columnHelper, {
        minSize: 10,
        size: 30,
        maxSize: 50,
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

export const DefaultWithSubcomponent: StoryObj<typeof Table<Fruit>> = {
  render: TemplateWithSubcomponent,
  args: {},
};

const TemplateWithAutoPagination: StoryFn<typeof Table<Fruit>> = (args) => {
  const columnHelper = createColumnHelper<Fruit>();
  const tableInstanceRef = useRef<TableInstance<Fruit> | null>(null);
  const [pageSize, setPageSize] = useState(10);

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

  const data = useMemo(() => {
    const data: Fruit[] = [];
    for (let i = 0; i < 995; i++) {
      data.push({
        id: i,
        name: `Fruit ${i}`,
        taste: `Taste ${i}`,
      });
    }
    return data;
  }, []);

  return (
    <Table
      {...args}
      data={data}
      columns={columns}
      enablePagination
      pageSize={pageSize}
      enablePageResize
      onPageResize={(size) => {
        setPageSize(size);
      }}
      ref={tableInstanceRef}
    />
  );
};

export const DefaultWithAutoPagination: StoryObj<typeof Table<Fruit>> = {
  render: TemplateWithAutoPagination,
  args: {},
};

const TemplateWithManualPagination: StoryFn<typeof Table<Fruit>> = (args) => {
  const columnHelper = createColumnHelper<Fruit>();
  const [{ pageIndex, pageSize }, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

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

  const data = useMemo(() => {
    const data: Fruit[] = [];
    for (let i = 0; i < 995; i++) {
      data.push({
        id: i,
        name: `Fruit ${i}`,
        taste: `Taste ${i}`,
      });
    }
    return data.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  }, [pageIndex]);

  return (
    <Table
      {...args}
      data={data}
      columns={columns}
      enablePagination
      manualPagination
      totalRows={995}
      pageSize={pageSize}
      pageIndex={pageIndex}
      onPaginationChange={setPagination}
    />
  );
};

export const DefaultWithManualPagination: StoryObj<typeof Table<Fruit>> = {
  render: TemplateWithManualPagination,
  args: {},
};

export const WithColumnResizing: StoryObj<typeof Table<Fruit>> = {
  render: TemplateWithManualPagination,
  args: { enableColumnResizing: true, enableSorting: true },
};

const TemplateWithAutoSorting: StoryFn<typeof Table<Fruit>> = (args) => {
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
        enableSorting: false,
      }),
    ],
    [],
  );

  const data = useMemo(() => {
    const data: Fruit[] = [];
    for (let i = 0; i < 995; i++) {
      data.push({
        id: i,
        name: `Fruit ${i}`,
        taste: `Taste ${i}`,
      });
    }
    return data;
  }, []);
  return <Table {...args} data={data} columns={columns} enablePagination enableSorting />;
};

export const DefaultWithAutoSorting: StoryObj<typeof Table<Fruit>> = {
  render: TemplateWithAutoSorting,
  args: {},
};

const TemplateWithManualSorting: StoryFn<typeof Table<Fruit>> = (args) => {
  const columnHelper = createColumnHelper<Fruit>();
  const [{ pageIndex, pageSize }, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sort, setSort] = useState<SortingState>([]);

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

  const data = useMemo(() => {
    let data: Fruit[] = [];

    for (let i = 0; i < 995; i++) {
      data.push({
        id: i,
        name: `Fruit ${i}`,
        taste: `Taste ${i}`,
      });
    }

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
      {...args}
      data={data}
      columns={columns}
      enablePagination
      manualPagination
      totalRows={995}
      pageSize={pageSize}
      pageIndex={pageIndex}
      onPaginationChange={setPagination}
      enableSorting
      manualSorting
      sortingState={sort}
      onSortingChange={setSort}
    />
  );
};

export const DefaultWithManualSorting: StoryObj<typeof Table<Fruit>> = {
  render: TemplateWithManualSorting,
  args: {},
};

const TemplateWithRowSelection: StoryFn<typeof Table<Fruit>> = (args) => {
  const columnHelper = createColumnHelper<Fruit>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [pageSize, setPageSize] = useState(10);

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        size: 50,
        minSize: 50,
        maxSize: 50,
      }),
      columnHelper.accessor('id', {
        cell: (info) => info.getValue(),
        header: () => 'ID',
        size: 100,
        minSize: 50,
        maxSize: 1000,
      }),
      columnHelper.accessor((row) => row.name, {
        id: 'name',
        cell: (info) => info.getValue(),
        header: () => <span>Name</span>,
        size: 100,
        minSize: 50,
        maxSize: 1000,
      }),
      columnHelper.accessor('taste', {
        header: () => 'Taste',
        cell: (info) => info.renderValue(),
        size: 100,
        minSize: 50,
        maxSize: 1000,
      }),
    ],
    [],
  );

  const data = useMemo(() => {
    const data: Fruit[] = [];
    for (let i = 0; i < 995; i++) {
      data.push({
        id: i,
        name: `Fruit ${i}`,
        taste: `Taste ${i}`,
      });
    }
    return data;
  }, []);
  return (
    <>
      <Table
        {...args}
        data={data}
        columns={columns}
        enablePagination
        enablePageResize
        pageSize={pageSize}
        onPageResize={(size) => {
          setPageSize(size);
        }}
        enableSorting
        enableRowSelection
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        getRowId={({ id }) => {
          return `id-${id}`;
        }}
      />
    </>
  );
};

export const DefaultWithRowSelection: StoryObj<typeof Table<Fruit>> = {
  render: TemplateWithRowSelection,
  args: {},
};

type NestedFruit = Fruit & {
  fruits?: NestedFruit[];
};

const TemplateWithSubRows: StoryFn<typeof Table<NestedFruit>> = (args) => {
  const columnHelper = createColumnHelper<NestedFruit>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});

  const columns = useMemo(
    () => [
      getRowExpanderColumn(columnHelper),
      getRowSelectionColumn(columnHelper, {
        size: 50,
        minSize: 50,
        maxSize: 50,
      }),
      columnHelper.accessor('id', {
        cell: (info) => info.getValue(),
        header: () => 'ID',
        size: 100,
        minSize: 50,
        maxSize: 1000,
      }),
      columnHelper.accessor((row) => row.name, {
        id: 'name',
        cell: (info) => info.getValue(),
        header: () => <span>Name</span>,
        size: 100,
        minSize: 50,
        maxSize: 1000,
      }),
      columnHelper.accessor('taste', {
        header: () => 'Taste',
        cell: (info) => info.renderValue(),
        size: 100,
        minSize: 50,
        maxSize: 1000,
      }),
    ],
    [],
  );

  const data = useMemo(() => {
    const data: NestedFruit[] = [];
    for (let i = 0; i < 20; i++) {
      data.push({
        id: i,
        name: `Fruit ${i}`,
        taste: `Taste ${i}`,
        fruits: [
          { id: (i + 1) * 1000 + 1, name: `Fruit ${i} 1`, taste: `Taste ${i} 1` },
          { id: (i + 1) * 1000 + 2, name: `Fruit ${i} 2`, taste: `Taste ${i} 2` },
        ],
      });
    }
    return data;
  }, []);
  return (
    <>
      <Table
        {...args}
        data={data}
        columns={columns}
        enablePagination
        enableSorting
        enableRowSelection
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        getSubRows={(row) => row.fruits}
        getRowId={({ id }) => {
          return `id-${id}`;
        }}
      />
    </>
  );
};

export const DefaultWithSubRows: StoryObj<typeof Table<Fruit>> = {
  render: TemplateWithSubRows,
  args: {},
};

const TemplateWithNoData: StoryFn<typeof Table<Fruit>> = (args) => {
  const columnHelper = createColumnHelper<Fruit>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [pageSize, setPageSize] = useState(10);

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        size: 50,
        minSize: 50,
        maxSize: 50,
      }),
      columnHelper.accessor('id', {
        cell: (info) => info.getValue(),
        header: () => 'ID',
        size: 100,
        minSize: 50,
        maxSize: 1000,
      }),
      columnHelper.accessor((row) => row.name, {
        id: 'name',
        cell: (info) => info.getValue(),
        header: () => <span>Name</span>,
        size: 100,
        minSize: 50,
        maxSize: 1000,
      }),
      columnHelper.accessor('taste', {
        header: () => 'Taste',
        cell: (info) => info.renderValue(),
        size: 100,
        minSize: 50,
        maxSize: 1000,
      }),
    ],
    [],
  );

  return (
    <>
      <Table
        {...args}
        data={[]}
        columns={columns}
        enablePagination
        enablePageResize
        pageSize={pageSize}
        onPageResize={(size) => {
          setPageSize(size);
        }}
        enableSorting
        enableRowSelection
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        getRowId={({ id }) => {
          return `id-${id}`;
        }}
      />
    </>
  );
};

export const DefaultWithNoData: StoryObj<typeof Table<Fruit>> = {
  render: TemplateWithNoData,
  args: {},
};

const SkeletonTemplate: StoryFn<typeof TableSkeleton> = (args) => {
  return <TableSkeleton {...args} />;
};

export const DefaultTableSkeleton: StoryObj<typeof TableSkeleton> = {
  render: SkeletonTemplate,

  args: {
    columns: 5,
    rows: 3,
    size: 'default',
  },
};
