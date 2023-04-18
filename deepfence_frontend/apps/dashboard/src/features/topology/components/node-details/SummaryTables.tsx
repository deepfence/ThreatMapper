import { capitalize, sortBy } from 'lodash-es';
import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import {
  ModelConnection,
  ModelContainer,
  ModelContainerImage,
  ModelProcess,
} from '@/api/generated';
import { formatMemory, formatPercentage } from '@/utils/number';

const tableClass = 'w-full table-fixed';
const tableHeaderClass = 'text-gray-600 dark:text-gray-400';
const tableBodyClass = 'text-gray-700 dark:text-gray-300';
const tableHeaderCellClass =
  'text-xs font-semibold text-gray-500 dark:text-gray-400 text-left uppercase cursor-pointer user-select-none';
const tableBodyCellClass = 'text-sm font-normal text-left';
const tableRowClass = 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer';
const moreButtonClass =
  'text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase w-full text-right';

const SUMMARY_ROWS = 10;

function SortableHeader({
  sortId,
  sortBy,
  order,
  className,
  label,
  onSortChange,
}: {
  sortId: string;
  sortBy: string;
  order: 'asc' | 'desc';
  className?: string;
  label: string;
  onSortChange: (newSortBy: string, newOrder: 'asc' | 'desc') => void;
}) {
  return (
    <th
      className={twMerge(tableHeaderCellClass, className)}
      onClick={(e) => {
        e.preventDefault();
        onSortChange(
          sortId,
          sortId === sortBy ? (order === 'asc' ? 'desc' : 'asc') : 'desc',
        );
      }}
    >
      {label}{' '}
      {sortId === sortBy ? (
        <span className="text-gray-500 dark:text-gray-400">
          {order === 'asc' ? '▲' : '▼'}
        </span>
      ) : null}
    </th>
  );
}

function useSortingState({ initialSortBy }: { initialSortBy: string }) {
  const [sortState, setSortState] = useState({
    sortBy: initialSortBy,
    order: 'desc' as 'asc' | 'desc',
  });

  function onSortChange(newSortBy: string, newOrder: 'asc' | 'desc') {
    setSortState({ sortBy: newSortBy, order: newOrder });
  }

  return { sortState, onSortChange };
}

export const ProcessTable = ({
  processes,
  onNodeClick,
}: {
  processes: ModelProcess[];
  onNodeClick: (nodeId: string, nodeType: string) => void;
}) => {
  const [sortedData, setSortedData] = useState(processes);
  const [showAll, setShowAll] = useState(false);
  const { sortState, onSortChange } = useSortingState({ initialSortBy: 'memory_usage' });

  const first5Rows = sortedData.slice(0, SUMMARY_ROWS);
  const remainingRows = sortedData.slice(SUMMARY_ROWS).length;

  useEffect(() => {
    setSortedData(() => {
      if (sortState.order === 'asc') {
        return sortBy(processes, [sortState.sortBy]);
      }
      return sortBy(processes, [sortState.sortBy]).reverse();
    });
  }, [processes, sortState]);

  return (
    <div>
      <table className={tableClass}>
        <thead className={tableHeaderClass}>
          <tr>
            <SortableHeader
              sortId="node_name"
              sortBy={sortState.sortBy}
              order={sortState.order}
              className="w-[60%]"
              label="Process"
              onSortChange={onSortChange}
            />
            <SortableHeader
              sortId="pid"
              sortBy={sortState.sortBy}
              order={sortState.order}
              className="w-[10%]"
              label="PID"
              onSortChange={onSortChange}
            />
            <SortableHeader
              sortId="cpu_usage"
              sortBy={sortState.sortBy}
              order={sortState.order}
              className="text-right w-[15%]"
              label="CPU"
              onSortChange={onSortChange}
            />
            <SortableHeader
              sortId="memory_usage"
              sortBy={sortState.sortBy}
              order={sortState.order}
              className="text-right w-[15%]"
              label="Memory"
              onSortChange={onSortChange}
            />
          </tr>
        </thead>
        <tbody className={tableBodyClass}>
          {(showAll ? sortedData : first5Rows).map((process) => {
            return (
              <tr
                key={process.pid}
                className={tableRowClass}
                onClick={() => {
                  onNodeClick(process.node_id, 'process');
                }}
              >
                <td className={twMerge(tableBodyCellClass, '')}>{process.node_name}</td>
                <td className={twMerge(tableBodyCellClass, '')}>{process.pid}</td>
                <td className={twMerge(tableBodyCellClass, 'text-right')}>
                  {formatPercentage(
                    (process.cpu_usage / (process.cpu_max || 100)) * 100,
                    {
                      maximumFractionDigits: 1,
                    },
                  )}
                </td>
                <td className={twMerge(tableBodyCellClass, 'text-right')}>
                  {formatMemory(process.memory_usage ?? 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {remainingRows > 0 && !showAll ? (
        <button
          onClick={() => {
            setShowAll(true);
          }}
          className={moreButtonClass}
        >
          +{remainingRows} More
        </button>
      ) : null}
      {!sortedData.length ? <NoData>No Processes</NoData> : null}
    </div>
  );
};

export const ContainerTable = ({
  containers,
  onNodeClick,
}: {
  containers: ModelContainer[];
  onNodeClick: (nodeId: string, nodeType: string) => void;
}) => {
  const [sortedData, setSortedData] = useState(containers);
  const [showAll, setShowAll] = useState(false);
  const { sortState, onSortChange } = useSortingState({ initialSortBy: 'memory_usage' });

  const first5Rows = sortedData.slice(0, SUMMARY_ROWS);
  const remainingRows = sortedData.slice(SUMMARY_ROWS).length;

  useEffect(() => {
    setSortedData(() => {
      if (sortState.order === 'asc') {
        return sortBy(containers, [sortState.sortBy]);
      }
      return sortBy(containers, [sortState.sortBy]).reverse();
    });
  }, [containers, sortState]);

  return (
    <div>
      <table className={tableClass}>
        <thead className={tableHeaderClass}>
          <tr>
            <SortableHeader
              sortId="docker_container_name"
              sortBy={sortState.sortBy}
              order={sortState.order}
              className="w-[70%]"
              label="Container"
              onSortChange={onSortChange}
            />
            <SortableHeader
              sortId="cpu_usage"
              sortBy={sortState.sortBy}
              order={sortState.order}
              className="text-right w-[15%]"
              label="CPU"
              onSortChange={onSortChange}
            />
            <SortableHeader
              sortId="memory_usage"
              sortBy={sortState.sortBy}
              order={sortState.order}
              className="text-right w-[15%]"
              label="Memory"
              onSortChange={onSortChange}
            />
          </tr>
        </thead>
        <tbody className={tableBodyClass}>
          {(showAll ? sortedData : first5Rows).map((container) => {
            return (
              <tr
                key={container.node_id}
                onClick={() => {
                  onNodeClick(container.node_id, 'container');
                }}
                className={tableRowClass}
              >
                <td className={twMerge(tableBodyCellClass, '')}>
                  {container.docker_container_name}
                </td>
                <td className={twMerge(tableBodyCellClass, 'text-right')}>
                  {formatPercentage(
                    (container.cpu_usage / (container.cpu_max || 100)) * 100,
                    {
                      maximumFractionDigits: 1,
                    },
                  )}
                </td>
                <td className={twMerge(tableBodyCellClass, 'text-right')}>
                  {formatMemory(container.memory_usage ?? 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {remainingRows > 0 && !showAll ? (
        <button
          onClick={() => {
            setShowAll(true);
          }}
          className={moreButtonClass}
        >
          +{remainingRows} More
        </button>
      ) : null}
      {!sortedData.length ? <NoData>No Containers</NoData> : null}
    </div>
  );
};

export const ImageTable = ({
  images,
  onNodeClick,
}: {
  images: ModelContainerImage[];
  onNodeClick: (nodeId: string, nodeType: string) => void;
}) => {
  const [sortedData, setSortedData] = useState(images);
  const [showAll, setShowAll] = useState(false);

  const { sortState, onSortChange } = useSortingState({
    initialSortBy: 'docker_image_size',
  });

  const first5Rows = sortedData.slice(0, SUMMARY_ROWS);
  const remainingRows = sortedData.slice(SUMMARY_ROWS).length;

  useEffect(() => {
    setSortedData(() => {
      if (sortState.order === 'asc') {
        return sortBy(images, [sortState.sortBy]);
      }
      return sortBy(images, [sortState.sortBy]).reverse();
    });
  }, [images, sortState]);

  return (
    <div>
      <table className={tableClass}>
        <thead className={tableHeaderClass}>
          <tr>
            <SortableHeader
              sortId="docker_image_name"
              sortBy={sortState.sortBy}
              order={sortState.order}
              className="w-[80%]"
              label="Container Image"
              onSortChange={onSortChange}
            />
            <SortableHeader
              sortId="docker_image_size"
              sortBy={sortState.sortBy}
              order={sortState.order}
              className="text-right w-[20%]"
              label="Size"
              onSortChange={onSortChange}
            />
          </tr>
        </thead>
        <tbody className={tableBodyClass}>
          {(showAll ? sortedData : first5Rows).map((image) => {
            return (
              <tr
                key={image.node_id}
                onClick={() => {
                  onNodeClick(image.node_id, 'container_image');
                }}
                className={tableRowClass}
              >
                <td className={twMerge(tableBodyCellClass, '')}>
                  {image.docker_image_name}:{image.docker_image_tag}
                </td>
                <td className={twMerge(tableBodyCellClass, 'text-right')}>
                  {image.docker_image_size}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {remainingRows > 0 && !showAll ? (
        <button
          onClick={() => {
            setShowAll(true);
          }}
          className={moreButtonClass}
        >
          +{remainingRows} More
        </button>
      ) : null}
      {!sortedData.length ? <NoData>No Images</NoData> : null}
    </div>
  );
};

export const ConnectionsTable = ({
  type,
  connections,
}: {
  type: 'inbound' | 'outbound';
  connections: ModelConnection[];
}) => {
  const [sortedData, setSortedData] = useState(connections);
  const [showAll, setShowAll] = useState(false);
  const { sortState, onSortChange } = useSortingState({ initialSortBy: 'count' });

  const first5Rows = sortedData.slice(0, SUMMARY_ROWS);
  const remainingRows = sortedData.slice(SUMMARY_ROWS).length;

  useEffect(() => {
    setSortedData(() => {
      if (sortState.order === 'asc') {
        return sortBy(connections, [sortState.sortBy]);
      }
      return sortBy(connections, [sortState.sortBy]).reverse();
    });
  }, [connections, sortState]);

  return (
    <div>
      <table className={tableClass}>
        <thead className={tableHeaderClass}>
          <tr>
            <SortableHeader
              sortId="node_name"
              sortBy={sortState.sortBy}
              order={sortState.order}
              className="w-[80%]"
              label={`${capitalize(type)} Connections`}
              onSortChange={onSortChange}
            />
            <SortableHeader
              sortId="count"
              sortBy={sortState.sortBy}
              order={sortState.order}
              className="text-right w-[20%]"
              label="#"
              onSortChange={onSortChange}
            />
          </tr>
        </thead>
        <tbody className={tableBodyClass}>
          {(showAll ? sortedData : first5Rows).map((connection) => {
            return (
              <tr key={connection.node_id} className={tableRowClass}>
                <td className={twMerge(tableBodyCellClass, '')}>
                  {connection.node_name ?? connection.node_id}
                </td>
                <td className={twMerge(tableBodyCellClass, 'text-right')}>
                  {connection.count ?? 0}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {remainingRows > 0 && !showAll ? (
        <button
          onClick={() => {
            setShowAll(true);
          }}
          className={moreButtonClass}
        >
          +{remainingRows} More
        </button>
      ) : null}
      {!sortedData.length ? <NoData>No {type} connections</NoData> : null}
    </div>
  );
};

const NoData = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-12 flex items-center justify-center text-gray-400 dark:text-gray-300">
      {children}
    </div>
  );
};
