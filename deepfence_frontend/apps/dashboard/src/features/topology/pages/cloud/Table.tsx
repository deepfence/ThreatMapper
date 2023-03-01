import classNames from 'classnames';
import { useMemo, useState } from 'react';
import { HiMinus, HiPlus } from 'react-icons/hi';
import { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router-dom';
import {
  Badge,
  Checkbox,
  createColumnHelper,
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

interface HeaderRow extends BaseRow {
  kind: 'header';
  siblingKind: 'host' | 'container' | 'process';
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
  | HeaderRow
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
            kind: 'header',
            name: '',
            siblingKind: 'host',
          },
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
                kind: 'header',
                name: '',
                siblingKind: 'process',
              },
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
            kind: 'header',
            name: '',
            siblingKind: 'host',
          },
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
                kind: 'header',
                name: '',
                siblingKind: 'process',
              },
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
                kind: 'header',
                name: '',
                siblingKind: 'process',
              },
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
      columnHelper.display({
        id: 'selection',
        header: ({ table }) => {
          return (
            <Checkbox
              checked={
                table.getIsSomeRowsSelected()
                  ? 'indeterminate'
                  : table.getIsAllRowsSelected()
              }
              onCheckedChange={(state) => {
                table.getToggleAllRowsSelectedHandler()({
                  target: {
                    checked: state === true,
                  },
                });
              }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
        cell: ({ row }) => {
          if (row.original.kind === 'header') return null;
          return (
            <Checkbox
              checked={row.getIsSomeSelected() ? 'indeterminate' : row.getIsSelected()}
              onCheckedChange={(state) => {
                if (row.getCanSelect()) {
                  row.toggleSelected(state === true);
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          );
        },
        enableResizing: false,
        minSize: 40,
        size: 40,
        maxSize: 60,
      }),
      columnHelper.accessor('name', {
        cell: (info) => {
          const { depth, original } = info.row;
          if (original.kind === 'header') return null;
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
        minSize: 100,
        size: 150,
        maxSize: 400,
      }),
      columnHelper.accessor((row) => row.kind, {
        id: 'type',
        cell: (info) => {
          const { original } = info.row;
          if (original.kind === 'header') return null;
          return info.getValue().replaceAll('_', ' ');
        },
        header: () => <span>type</span>,
        minSize: 70,
        size: 100,
        maxSize: 100,
        enableSorting: false,
      }),
      columnHelper.display({
        id: 'extra-1',
        header: '',
        cell: (info) => {
          if (info.row.original.kind === 'header') {
            let text = '';
            if (info.row.original.siblingKind === 'host') text = 'OS';
            if (info.row.original.siblingKind === 'container') text = 'Image';
            if (info.row.original.siblingKind === 'process') text = 'Command';
            return (
              <div className="uppercase text-xs font-semibold text-gray-500 dark:text-white">
                {text}
              </div>
            );
          } else if (info.row.original.kind === 'host') {
            return info.row.original.os;
          } else if (info.row.original.kind === 'container') {
            return info.row.original.image;
          } else if (info.row.original.kind === 'process') {
            return info.row.original.command;
          }
          return null;
        },
        minSize: 100,
        size: 100,
        maxSize: 150,
      }),
      columnHelper.display({
        id: 'extra-2',
        header: '',
        cell: (info) => {
          if (info.row.original.kind === 'header') {
            let text = '';
            if (info.row.original.siblingKind === 'host') text = 'Agent Version';
            if (info.row.original.siblingKind === 'container') text = 'State';
            if (info.row.original.siblingKind === 'process') text = 'PID';
            return (
              <div className="uppercase text-xs font-semibold text-gray-500 dark:text-white">
                {text}
              </div>
            );
          } else if (info.row.original.kind === 'host') {
            return info.row.original.agentVersion;
          } else if (info.row.original.kind === 'container') {
            return info.row.original.state;
          } else if (info.row.original.kind === 'process') {
            return info.row.original.pid;
          }
          return null;
        },
        minSize: 100,
        size: 100,
        maxSize: 150,
      }),
      columnHelper.display({
        id: 'extra-3',
        header: '',
        cell: (info) => {
          if (info.row.original.kind === 'header') {
            return (
              <div className="uppercase text-xs font-semibold text-gray-500 dark:text-white">
                Vulnerability Scan
              </div>
            );
          } else if (
            info.row.original.kind === 'host' ||
            info.row.original.kind === 'container'
          ) {
            return <StatusBadge status={info.row.original.vulnerabilityStatus} />;
          }
          return null;
        },
        minSize: 100,
        size: 100,
        maxSize: 150,
      }),
      columnHelper.display({
        id: 'extra-4',
        header: '',
        cell: (info) => {
          if (info.row.original.kind === 'header') {
            return (
              <div className="uppercase text-xs font-semibold text-gray-500 dark:text-white">
                Secret Scan
              </div>
            );
          } else if (
            info.row.original.kind === 'host' ||
            info.row.original.kind === 'container'
          ) {
            return <StatusBadge status={info.row.original.secretStatus} />;
          }
          return null;
        },
        minSize: 100,
        size: 100,
        maxSize: 150,
      }),
      columnHelper.display({
        id: 'extra-5',
        header: '',
        cell: (info) => {
          if (info.row.original.kind === 'header') {
            return (
              <div className="uppercase text-xs font-semibold text-gray-500 dark:text-white">
                Malware Scan
              </div>
            );
          } else if (
            info.row.original.kind === 'host' ||
            info.row.original.kind === 'container'
          ) {
            return <StatusBadge status={info.row.original.malwareStatus} />;
          }
          return null;
        },
        minSize: 100,
        size: 100,
        maxSize: 150,
      }),
      columnHelper.display({
        id: 'extra-6',
        header: '',
        cell: (info) => {
          if (
            info.row.original.kind === 'header' &&
            info.row.original.siblingKind === 'host'
          ) {
            return (
              <div className="uppercase text-xs font-semibold text-gray-500 dark:text-white">
                Tags
              </div>
            );
          } else if (info.row.original.kind === 'host') {
            return info.row.original.tags;
          }
          return null;
        },
        minSize: 30,
        size: 40,
        maxSize: 100,
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
        getTdProps={(cell) => {
          return {
            className:
              cell.row.original.kind === 'header'
                ? 'bg-gray-50 dark:bg-gray-700'
                : undefined,
          };
        }}
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
