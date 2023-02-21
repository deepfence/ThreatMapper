import cx from 'classnames';
import { HiDotsHorizontal } from 'react-icons/hi';
import { Button, Dropdown, DropdownItem, DropdownSeparator, Table } from 'ui-components';

const tableData = [
  {
    timestamp: 'Feb 7 2023 3:00:00',
    nodeType: 'type',
    action: 'Action',
    cron: 'Example',
    active: 'Example',
    nodes: 'Example',
    status: 'Example',
  },
  {
    timestamp: 'Feb 7 2023 3:05:00',
    nodeType: 'type',
    action: 'Action',
    cron: 'Example',
    active: 'Example',
    nodes: 'Example',
    status: 'Example',
  },
  {
    timestamp: 'Feb 7 2023 3:10:00',
    nodeType: 'type',
    action: 'Action',
    cron: 'Example',
    active: 'Example',
    nodes: 'Example',
    status: 'Example',
  },
];

const tableColumns = [
  {
    accessorKey: 'timestamp',
    size: 200,
  },
  {
    accessorKey: 'nodeType',
  },
  {
    accessorKey: 'action',
  },
  {
    accessorKey: 'cron',
  },
  {
    accessorKey: 'active',
  },
  {
    accessorKey: 'nodes',
  },
  {
    accessorKey: 'status',
  },
  {
    cell: () => (
      <Dropdown
        content={
          <>
            <DropdownItem>Details</DropdownItem>

            <DropdownSeparator />
            <DropdownItem>Edit</DropdownItem>
          </>
        }
        triggerAsChild
      >
        <Button
          className={cx(
            'text-sm text-left flex items-center gap-5',
            'border-b dark:border-gray-700 border-gray-200 dark:text-gray-300 dark:bg-transparent h-fit',
          )}
        >
          {' '}
          <HiDotsHorizontal />
        </Button>
      </Dropdown>
    ),
    enableResizing: false,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    header: function noRefCheck() {},
    id: 'actions',
    maxSize: 100,
    minSize: 100,
    size: 100,
  },
];

export const ScheduledJobsForm = () => {
  return (
    <div>
      <Table size="sm" columns={tableColumns} data={tableData} />
    </div>
  );
};
