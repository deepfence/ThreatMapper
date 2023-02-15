import cx from 'classnames';
import { useMemo, useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import { FiFilter } from 'react-icons/fi';
import { HiClock, HiDotsVertical } from 'react-icons/hi';
import { RxDoubleArrowLeft } from 'react-icons/rx';
import {
  Badge,
  Button,
  createColumnHelper,
  getRowSelectionColumn,
  Table,
} from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { IconMapForNodeType } from '@/features/onboard/components/IconMapForNodeType';
import { UniqueVulnerabilityFilterModal } from '@/features/vulnerabilities/components/unique-vulnerabilities/UniqueVulnerabilityFilterModal';

type TableDataType = {
  nodeType: string;
  nodeName: string;
  timestamp: string;
  status: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  action?: null;
};

const data = Array.from(Array(25).keys()).map((i) => {
  return {
    nodeType: i % 2 === 0 ? 'container_image' : 'host',
    nodeName: 'nginx',
    timestamp: 'Dec 2 2022 6:42:09',
    status: i % 2 === 0 ? 'Completed' : 'Failed',
    total: 1234,
    critical: 99,
    high: 3,
    medium: 29,
    low: 188,
  };
});
const UniqueVulnerabilities = () => {
  const elementToFocusOnClose = useRef(null);
  const [showFilter, setShowFilter] = useState(false);

  const columnHelper = createColumnHelper<TableDataType>();
  const columns = useMemo(() => {
    const columns = [
      getRowSelectionColumn(columnHelper, {
        size: 0,
        minSize: 0,
        maxSize: 0,
      }),
      columnHelper.accessor('nodeType', {
        enableSorting: false,
        cell: (info) => {
          return (
            <div className="flex items-center gap-x-2">
              <div className="bg-blue-100 dark:bg-blue-500/10 p-2 rounded-lg">
                <IconContext.Provider
                  value={{ className: 'w-5 h-5 text-blue-500 dark:text-blue-400' }}
                >
                  {IconMapForNodeType[info.getValue()]}
                </IconContext.Provider>
              </div>
              <span className="capitalize">{info.getValue()?.replaceAll('_', ' ')}</span>
            </div>
          );
        },
        header: () => 'Type',
        minSize: 500,
      }),
      columnHelper.accessor('nodeName', {
        enableSorting: false,
        cell: (info) => info.getValue(),
        header: () => 'Name',
        minSize: 500,
      }),
      columnHelper.accessor('timestamp', {
        cell: (info) => (
          <div className="flex items-center gap-x-2">
            <IconContext.Provider value={{ className: 'text-gray-400 ' }}>
              <HiClock />
            </IconContext.Provider>
            {info.getValue()}
          </div>
        ),
        header: () => 'Timestamp',
        minSize: 500,
      }),
      columnHelper.accessor('status', {
        enableSorting: false,
        cell: (info) => (
          <Badge
            label={info.getValue()}
            className={cx({
              'bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400':
                info.getValue().toLocaleLowerCase() === 'completed',
              'bg-red-100 dark:bg-red-600/10 text-red-600 dark:text-red-400':
                info.getValue().toLocaleLowerCase() === 'failed',
            })}
            size="sm"
          />
        ),
        header: () => 'Status',
        minSize: 500,
      }),
      columnHelper.accessor('total', {
        enableSorting: true,
        cell: (info) => (
          <div className="flex items-center gap-x-2">
            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500"></div>
            {info.getValue()}
          </div>
        ),
        header: () => (
          <div className="flex items-center">
            <span className="w-5 h-5 mr-1 text-blue-500 dark:text-blue-400">
              <VulnerabilityIcon />
            </span>
            Total
          </div>
        ),
        minSize: 200,
      }),
      columnHelper.accessor('critical', {
        enableSorting: false,
        cell: (info) => (
          <div className="flex items-center gap-x-2">
            <div className="w-2 h-2 bg-red-400 dark:bg-red-500 rounded-full"></div>
            {info.getValue()}
          </div>
        ),
        header: () => '',
        minSize: 200,
      }),
      columnHelper.accessor('high', {
        enableSorting: false,
        cell: (info) => (
          <div className="flex items-center gap-x-2">
            <div className="w-2 h-2 bg-pink-400 dark:bg-pink-500 rounded-full"></div>
            {info.getValue()}
          </div>
        ),
        header: () => '',
        minSize: 200,
      }),
      columnHelper.accessor('medium', {
        enableSorting: false,
        cell: (info) => (
          <div className="flex items-center gap-x-2">
            <div className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full"></div>
            {info.getValue()}
          </div>
        ),
        header: () => '',
        minSize: 200,
      }),
      columnHelper.accessor('low', {
        enableSorting: false,
        cell: (info) => (
          <div className="flex items-center gap-x-2">
            <div className="w-2 h-2 bg-yellow-300 dark:bg-yellow-500 rounded-full"></div>
            {info.getValue()}
          </div>
        ),
        header: () => '',
        minSize: 200,
      }),
      columnHelper.accessor('action', {
        enableSorting: false,
        cell: (info) => (
          <IconContext.Provider value={{ className: 'text-gray-700 dark:text-gray-400' }}>
            <HiDotsVertical />
          </IconContext.Provider>
        ),
        header: () => '',
        minSize: 10,
      }),
    ];

    return columns;
  }, []);
  return (
    <div>
      <UniqueVulnerabilityFilterModal
        showFilter={showFilter}
        setShowFilter={setShowFilter}
        elementToFocusOnClose={elementToFocusOnClose.current}
      />
      <div className="flex p-1 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
        <span className="text-lg font-medium text-gray-700 dark:text-gray-200 mr-2">
          Unique Vulnerabilities
        </span>
        <DFLink
          to={'/vulnerability'}
          className="flex hover:no-underline items-center justify-center"
        >
          <IconContext.Provider
            value={{
              className: 'w-5 h-5 text-blue-600 dark:text-blue-500 ',
            }}
          >
            <RxDoubleArrowLeft />
          </IconContext.Provider>
          <span className="text-sm text-blue-600 dark:text-blue-500">Back</span>
        </DFLink>
        <div className="ml-auto relative">
          <span className="absolute left-0 top-0 inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
          <Button
            className="ml-auto bg-blue-100 dark:bg-blue-300/10"
            size="xs"
            color="normal"
            ref={elementToFocusOnClose}
            onClick={() => {
              setShowFilter(true);
            }}
          >
            <IconContext.Provider
              value={{
                className: 'w-4 h-4',
              }}
            >
              <FiFilter />
            </IconContext.Provider>
          </Button>
        </div>
      </div>
      <div className="m-2">
        <Table
          size="sm"
          data={data}
          columns={columns}
          enableRowSelection
          enableSorting
          getRowCanExpand={() => {
            return true;
          }}
          renderSubComponent={() => {
            return (
              <p className="dark:text-gray-200 py-2 px-4 overflow-auto text-sm">
                Error message will be displayed here
              </p>
            );
          }}
        />
      </div>
    </div>
  );
};

export const module = {
  element: <UniqueVulnerabilities />,
};
