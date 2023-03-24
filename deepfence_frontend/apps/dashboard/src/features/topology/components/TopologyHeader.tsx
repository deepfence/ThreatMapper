import classNames from 'classnames';
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip } from 'ui-components';

import { CloudIcon } from '@/components/icons/cloud';
import { ContainerIcon } from '@/components/icons/container';
import { GraphIcon } from '@/components/icons/graph';
import { HostIcon } from '@/components/icons/host';
import { ImageIcon } from '@/components/icons/image';
import { K8sIcon } from '@/components/icons/k8s';
import { NamespaceIcon } from '@/components/icons/namespace';
import { PodIcon } from '@/components/icons/pod';
import { TableIcon } from '@/components/icons/table';

export const TopologyHeader = () => {
  return (
    <div className="flex py-1 px-2 w-full shadow bg-white dark:bg-gray-800 items-center">
      <span className="text-md font-medium text-gray-700 dark:text-gray-200 uppercase">
        Topology
      </span>
      <div className="flex gap-4 ml-auto flex-1 shrink min-w-0">
        <div className="flex items-center gap-1 flex-1 shrink justify-end min-w-0">
          <ResourceSelectorButton
            icon={<CloudIcon />}
            name="Clouds"
            link=""
            count={10}
            active
          />
          <ResourceSelectorButton icon={<HostIcon />} name="Hosts" link="" count={38} />
          <ResourceSelectorButton
            icon={<K8sIcon />}
            name="Kubernetes Clusters"
            link=""
            count={3}
          />
          <ResourceSelectorButton
            icon={<ContainerIcon />}
            name="Containers"
            link=""
            count={87}
          />
          <ResourceSelectorButton
            icon={<ImageIcon />}
            name="Container Images"
            link=""
            count={334}
          />
          <ResourceSelectorButton
            icon={<NamespaceIcon />}
            name="Namespaces"
            link=""
            count={4}
          />
          <ResourceSelectorButton icon={<PodIcon />} name="Pods" link="" count={23} />
        </div>
        <div>
          <ViewSwitcher />
        </div>
      </div>
    </div>
  );
};

const ResourceSelectorButton = ({
  icon,
  name,
  link,
  count,
  active = false,
}: {
  icon: ReactNode;
  name: string;
  link: string;
  count: number;
  active?: boolean;
}) => {
  return (
    <Link
      to={link}
      className={classNames(
        'flex gap-1 items-center text-base font-medium rounded-lg h-full px-2 shrink justify-end min-w-0',
        {
          ['text-gray-700 dark:text-gray-400']: !active,
          ['text-blue-600 dark:text-blue-500']: active,
        },
      )}
    >
      <div className="h-6 w-6 shrink-0">{icon}</div>
      <div className="shrink">{count}</div>
      <div className="font-normal truncate">{name}</div>
    </Link>
  );
};

const ViewSwitcher = () => {
  const location = useLocation();

  const isGraphView = location.pathname.endsWith('graph');
  return (
    <div className="flex h-full">
      <Tooltip
        content={'Graph View'}
        triggerAsChild
        placement="bottom"
        delayDuration={200}
      >
        <Link
          to="/topology/graph"
          type="button"
          className={classNames(
            'flex items-center text-lg font-semibold rounded-l-lg h-full px-2 border-2 border-blue-600 dark:border-blue-600',
            {
              ['text-blue-600 dark:text-blue-500']: !isGraphView,
              ['bg-blue-600 text-gray-100 dark:text-white']: isGraphView,
            },
          )}
        >
          <div className="h-8 w-8">
            <GraphIcon />
          </div>
        </Link>
      </Tooltip>
      <Tooltip
        content={'Table View'}
        triggerAsChild
        placement="bottom"
        delayDuration={200}
      >
        <Link
          to="/topology/table"
          type="button"
          className={classNames(
            'flex items-center text-lg font-semibold rounded-r-lg h-full px-2 border-2 border-blue-600 dark:border-blue-600',
            {
              ['text-blue-600 dark:text-blue-500']: isGraphView,
              ['bg-blue-600 text-gray-100 dark:text-white']: !isGraphView,
            },
          )}
        >
          <div className="h-8 w-8">
            <TableIcon />
          </div>
        </Link>
      </Tooltip>
    </div>
  );
};
