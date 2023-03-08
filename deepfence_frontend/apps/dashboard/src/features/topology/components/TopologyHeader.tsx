import classNames from 'classnames';
import { ReactNode, useState } from 'react';
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
    <div className="flex p-1 w-full shadow bg-white dark:bg-gray-800 justify-between items-center">
      <span className="text-md font-medium text-gray-700 dark:text-gray-200 uppercase">
        Topology
      </span>
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
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
    <Tooltip content={name} triggerAsChild placement="bottom" delayDuration={200}>
      <button
        type="button"
        className={classNames(
          'flex items-center text-xl font-medium rounded-lg h-full px-2',
          {
            ['border-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500']:
              !active,
            ['bg-blue-600 text-gray-100 dark:border-blue-400 dark:text-white']: active,
          },
        )}
      >
        <div className="h-8 w-8">{icon}</div>
        {count}
      </button>
    </Tooltip>
  );
};

const ViewSwitcher = () => {
  const [activeView, setActiveView] = useState<'graph' | 'table'>('graph');
  const isGraphView = activeView === 'graph';
  return (
    <div className="flex h-full">
      <Tooltip
        content={'Graph View'}
        triggerAsChild
        placement="bottom"
        delayDuration={200}
      >
        <button
          type="button"
          className={classNames(
            'flex items-center text-lg font-semibold rounded-l-lg h-full px-2',
            {
              ['border-2 border-blue-600 text-blue-600 dark:border-blue-600 dark:text-blue-500']:
                !isGraphView,
              ['bg-blue-600 text-gray-100 dark:text-white']: isGraphView,
            },
          )}
        >
          <div className="h-8 w-8">
            <GraphIcon />
          </div>
        </button>
      </Tooltip>
      <Tooltip
        content={'Table View'}
        triggerAsChild
        placement="bottom"
        delayDuration={200}
      >
        <button
          type="button"
          className={classNames(
            'flex items-center text-lg font-semibold rounded-r-lg h-full px-2',
            {
              ['border-2 border-blue-600 text-blue-600 dark:border-blue-600 dark:text-blue-500']:
                isGraphView,
              ['bg-blue-600 text-gray-100 dark:text-white']: !isGraphView,
            },
          )}
        >
          <div className="h-8 w-8">
            <TableIcon />
          </div>
        </button>
      </Tooltip>
    </div>
  );
};
