import classNames from 'classnames';
import { useMemo, useState } from 'react';
import { HiMinus, HiPlus } from 'react-icons/hi';
import { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router-dom';
import {
  Badge,
  createColumnHelper,
  getRowSelectionColumn,
  RowSelectionState,
  Table,
} from 'ui-components';

import { DFLink } from '@/components/DFLink';

const loader = ({ request }: LoaderFunctionArgs) => {
  return null;
};

const actions = (args: ActionFunctionArgs) => {
  return null;
};

interface BaseRow {
  name: string;
}

interface CloudRow extends BaseRow {
  kind: 'cloud';
}

interface RegionRow extends BaseRow {
  kind: 'region';
}

interface KubernetesClusterRow extends BaseRow {
  kind: 'kubernetes_cluster';
}

interface HostRow extends BaseRow {
  kind: 'host';
  vulnerabilityStatus: string;
  malwareStatus: string;
  secretStatus: string;
  os: string;
  agentVersion: string;
  tags: string;
}

interface ContainerRow extends BaseRow {
  kind: 'container';
  image: string;
  state: string;
  vulnerabilityStatus: string;
  malwareStatus: string;
  secretStatus: string;
}

interface ProcessRow extends BaseRow {
  kind: 'process';
  command: string;
  pid: string;
}

type RowType = (
  | CloudRow
  | RegionRow
  | KubernetesClusterRow
  | HostRow
  | ContainerRow
  | ProcessRow
) & {
  children?: Array<RowType>;
};

const data: Array<RowType> = [
  {
    kind: 'cloud',
    name: 'DigitalOcean',
    children: [
      {
        kind: 'region',
        name: 'nyc1',
        children: [
          {
            kind: 'host',
            name: 'webapp-laravel-ip-123-123-123-123',
            malwareStatus: 'COMPLETE',
            secretStatus: 'COMPLETE',
            vulnerabilityStatus: 'COMPLETE',
            agentVersion: '1.2.3.4',
            os: 'linux',
            tags: '',
            children: [
              {
                kind: 'process',
                name: 'htop',
                command: 'htop -a -b -c',
                pid: '123',
              },
              {
                kind: 'process',
                name: 'curl',
                command: 'curl www.google.com',
                pid: '122',
              },
            ],
          },
        ],
      },
      {
        kind: 'region',
        name: 'sfo1',
      },
      {
        kind: 'kubernetes_cluster',
        name: 'c6217c0f-db01-476c-b6ea-f9ea15fe7358',
        children: [
          {
            kind: 'host',
            name: 'sample-host-12-12-12-1',
            malwareStatus: 'RUNNING',
            secretStatus: 'RUNNING',
            vulnerabilityStatus: 'ERROR',
            agentVersion: '1.2.3.4',
            os: 'linux',
            tags: '',
            children: [
              {
                kind: 'process',
                name: 'htop',
                command: 'htop -a -b -c',
                pid: '123',
              },
              {
                kind: 'process',
                name: 'curl',
                command: 'curl www.google.com',
                pid: '122',
              },
            ],
          },
          {
            kind: 'host',
            name: 'sample-host-12-12-12-2',
            malwareStatus: 'RUNNING',
            secretStatus: 'COMPLETE',
            vulnerabilityStatus: 'RUNNING',
            agentVersion: '1.2.3.4',
            os: 'linux',
            tags: '',
            children: [
              {
                kind: 'process',
                name: 'htop',
                command: 'htop -a -b -c',
                pid: '123',
              },
              {
                kind: 'process',
                name: 'curl',
                command: 'curl www.google.com',
                pid: '122',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    kind: 'cloud',
    name: 'AWS',
    children: [
      {
        kind: 'region',
        name: 'us-east-2',
      },
      {
        kind: 'region',
        name: 'ap-south-1',
      },
    ],
  },
  {
    kind: 'cloud',
    name: 'GCP',
    children: [
      {
        kind: 'region',
        name: 'eu1',
      },
      {
        kind: 'region',
        name: 'eu2',
      },
    ],
  },
];

function TopologyCloudTable() {
  const columnHelper = createColumnHelper<(typeof data)[number]>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 40,
        size: 40,
        maxSize: 40,
      }),
      columnHelper.accessor('name', {
        cell: (info) => {
          const { depth } = info.row;
          return (
            <div
              style={{
                paddingLeft: `${depth * 22}px`,
              }}
              className="flex items-center"
            >
              {info.row.getCanExpand() ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    info.row.getToggleExpandedHandler()();
                  }}
                >
                  {info.row.getIsExpanded() ? <HiMinus /> : <HiPlus />}
                </button>
              ) : (
                <span>&nbsp;&nbsp;&nbsp;</span>
              )}
              <DFLink href="#" className="flex-1 shrink-0 truncate pl-2">
                {info.getValue()}
              </DFLink>
            </div>
          );
        },
        header: () => 'name',
        minSize: 400,
        size: 500,
        maxSize: 1000,
      }),
      columnHelper.accessor((row) => row.kind, {
        id: 'type',
        cell: (info) => {
          return info.getValue().replaceAll('_', ' ');
        },
        header: () => <span>type</span>,
        minSize: 340,
        size: 400,
        maxSize: 500,
        enableSorting: false,
      }),
    ],
    [],
  );

  return (
    <>
      <Table
        size="sm"
        data={data}
        columns={columns}
        enableSorting
        enableRowSelection
        enableColumnResizing
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        getRowCanExpand={(row) => {
          return !!row.original.children?.length;
        }}
        getSubRows={(row) => row.children ?? []}
      />
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      label={status.toUpperCase().replaceAll('_', ' ')}
      className={classNames({
        'bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400':
          status.toLowerCase() === 'complete',
        'bg-red-100 dark:bg-red-600/10 text-red-600 dark:text-red-400':
          status.toLowerCase() === 'error',
        'bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400':
          status.toLowerCase() === 'in_progress',
      })}
      size="sm"
    />
  );
}

export const module = {
  loader,
  element: <TopologyCloudTable />,
};
