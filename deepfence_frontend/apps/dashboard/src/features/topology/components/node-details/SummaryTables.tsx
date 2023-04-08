import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { ModelContainer, ModelContainerImage, ModelProcess } from '@/api/generated';

const tableClass = 'w-full table-fixed';
const tableHeaderClass = 'text-gray-600 dark:text-gray-400';
const tableBodyClass = 'text-gray-700 dark:text-gray-300';
const tableHeaderCellClass = 'text-sm font-semibold text-left';
const tableBodyCellClass = 'text-sm font-normal text-left';
const tableRowClass = 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer';
const moreButtonClass =
  'text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase w-full text-right';

const SUMMARY_ROWS = 10;

export const ProcessTable = ({ processes }: { processes: ModelProcess[] }) => {
  const [sortedData, setSortedData] = useState(processes);
  const [showAll, setShowAll] = useState(false);

  const first5Rows = sortedData.slice(0, SUMMARY_ROWS);
  const remainingRows = sortedData.slice(SUMMARY_ROWS).length;

  useEffect(() => {
    setSortedData(processes);
  }, [processes]);

  return (
    <div>
      <table className={tableClass}>
        <thead className={tableHeaderClass}>
          <tr>
            <th className={twMerge(tableHeaderCellClass, 'w-[70%]')}>Process</th>
            <th className={twMerge(tableHeaderCellClass, 'w-[10%]')}>PID</th>
            <th className={twMerge(tableHeaderCellClass, 'text-right w-[10%]')}>CPU</th>
            <th className={twMerge(tableHeaderCellClass, 'text-right w-[10%]')}>
              Memory
            </th>
          </tr>
        </thead>
        <tbody className={tableBodyClass}>
          {(showAll ? sortedData : first5Rows).map((process) => {
            return (
              <tr key={process.pid} className={tableRowClass}>
                <td className={twMerge(tableBodyCellClass, '')}>{process.node_name}</td>
                <td className={twMerge(tableBodyCellClass, '')}>{process.pid}</td>
                <td className={twMerge(tableBodyCellClass, 'text-right')}>
                  {process.cpu_usage}
                </td>
                <td className={twMerge(tableBodyCellClass, 'text-right')}>
                  {process.memory_usage}
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

  const first5Rows = sortedData.slice(0, SUMMARY_ROWS);
  const remainingRows = sortedData.slice(SUMMARY_ROWS).length;

  useEffect(() => {
    setSortedData(containers);
  }, [containers]);

  return (
    <div>
      <table className={tableClass}>
        <thead className={tableHeaderClass}>
          <tr>
            <th className={twMerge(tableHeaderCellClass, 'w-[70%]')}>Container</th>
            <th className={twMerge(tableHeaderCellClass, 'text-right w-[15%]')}>CPU</th>
            <th className={twMerge(tableHeaderCellClass, 'text-right w-[15%]')}>
              Memory
            </th>
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
                  {container.cpu_usage}
                </td>
                <td className={twMerge(tableBodyCellClass, 'text-right')}>
                  {container.memory_usage}
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

  const first5Rows = sortedData.slice(0, SUMMARY_ROWS);
  const remainingRows = sortedData.slice(SUMMARY_ROWS).length;

  useEffect(() => {
    setSortedData(images);
  }, [images]);

  return (
    <div>
      <table className={tableClass}>
        <thead className={tableHeaderClass}>
          <tr>
            <th className={twMerge(tableHeaderCellClass, 'w-[80%]')}>Container Image</th>
            <th className={twMerge(tableHeaderCellClass, 'text-right w-[20%]')}>Size</th>
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

const NoData = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="h-12 flex items-center justify-center text-gray-400 dark:text-gray-300">
      {children}
    </div>
  );
};
