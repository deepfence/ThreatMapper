import cx from 'classnames';
import { MutableRefObject, RefObject, useMemo, useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import { FiFilter } from 'react-icons/fi';
import { RxDoubleArrowLeft } from 'react-icons/rx';
import { Badge, Button, createColumnHelper, Table } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
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
};

const data = Array.from(Array(25).keys()).map((i) => {
  return {
    nodeType: 'Container Image',
    nodeName: 'nginx',
    timestamp: 'Dec 2 2022 6:42:09',
    status: i % 2 === 0 ? 'Completed' : 'Failed',
    total: 1234,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
});
const UniqueVulnerabilities = () => {
  const elementToFocusOnClose =
    useRef<MutableRefObject<RefObject<HTMLButtonElement> | null>>(null);
  const [showFilter, setShowFilter] = useState(false);

  const columnHelper = createColumnHelper<TableDataType>();
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('nodeType', {
        cell: (info) => {
          return (
            <span className="capitalize">{info.getValue()?.replaceAll('_', ' ')}</span>
          );
        },
        header: () => 'Type',
        minSize: 500,
      }),
      columnHelper.accessor('nodeName', {
        cell: (info) => info.getValue(),
        header: () => 'Name',
        minSize: 500,
      }),
      columnHelper.accessor('timestamp', {
        cell: (info) => info.getValue(),
        header: () => 'Timestamp',
        minSize: 500,
      }),
      columnHelper.accessor('status', {
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
        cell: (info) => info.getValue(),
        header: () => (
          <div className="flex items-center">
            <span className="w-5 h-5 mr-1">
              <VulnerabilityIcon />
            </span>
            Total
          </div>
        ),
        minSize: 200,
      }),
      columnHelper.accessor('critical', {
        cell: (info) => info.getValue(),
        header: () => 'Critical',
        minSize: 200,
      }),
      columnHelper.accessor('high', {
        cell: (info) => info.getValue(),
        header: () => 'High',
        minSize: 200,
      }),
      columnHelper.accessor('medium', {
        cell: (info) => info.getValue(),
        header: () => 'Medium',
        minSize: 200,
      }),
      columnHelper.accessor('low', {
        cell: (info) => info.getValue(),
        header: () => 'Low',
        minSize: 200,
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
      <div className="m-2">
        <Table
          size="sm"
          data={data}
          columns={columns}
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
