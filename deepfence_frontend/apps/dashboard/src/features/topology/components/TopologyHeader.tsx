import classNames from 'classnames';
import { ReactNode, Suspense } from 'react';
import { generatePath, Link, useLocation, useMatches, useParams } from 'react-router-dom';
import { Tooltip } from 'ui-components';

import { SearchNodeCountResp } from '@/api/generated';
import { CloudIcon } from '@/components/icons/cloud';
import { ContainerIcon } from '@/components/icons/container';
import { GraphIcon } from '@/components/icons/graph';
import { HostIcon } from '@/components/icons/host';
import { K8sIcon } from '@/components/icons/k8s';
import { PodIcon } from '@/components/icons/pod';
import { TableIcon } from '@/components/icons/table';
import { TopologyViewTypes } from '@/features/topology/data-components/topologyLoader';
import { NodeType } from '@/features/topology/utils/topology-data';
import { DFAwait } from '@/utils/suspense';

const CountsSkeleton = () => {
  return (
    <div className="flex items-center gap-1 flex-1 shrink justify-end min-w-0">
      {[1, 2, 3, 4].map((idx) => {
        return (
          <div
            key={idx}
            className="bg-gray-200 dark:bg-gray-600 animate-pulse max-w-[150px] flex-1 h-6"
          />
        );
      })}
    </div>
  );
};

export const TopologyHeader = ({ nodeCounts }: { nodeCounts: SearchNodeCountResp }) => {
  return (
    <div className="flex p-1 px-2 w-full shadow bg-white dark:bg-gray-800 items-center">
      <span className="text-md font-medium text-gray-700 dark:text-gray-200">
        Topology
      </span>
      <div className="flex gap-x-4 ml-auto flex-1 shrink min-w-0">
        <Suspense fallback={<CountsSkeleton />}>
          <DFAwait resolve={nodeCounts}>
            {(data: SearchNodeCountResp) => {
              return (
                <div className="flex items-center gap-1 flex-1 shrink justify-end min-w-0">
                  <ResourceSelectorButton
                    icon={<CloudIcon />}
                    name="Clouds"
                    count={data.cloud_provider}
                    type={NodeType.cloud_provider}
                  />
                  <ResourceSelectorButton
                    icon={<HostIcon />}
                    name="Hosts"
                    type={NodeType.host}
                    count={data.host}
                  />
                  <ResourceSelectorButton
                    icon={<K8sIcon />}
                    name="Kubernetes Clusters"
                    count={data.kubernetes_cluster}
                    type={NodeType.kubernetes_cluster}
                  />
                  <ResourceSelectorButton
                    icon={<ContainerIcon />}
                    name="Containers"
                    count={data.container}
                    type={NodeType.container}
                  />
                  <ResourceSelectorButton
                    icon={<PodIcon />}
                    name="Pods"
                    type={NodeType.pod}
                    count={data.pod}
                  />
                </div>
              );
            }}
          </DFAwait>
        </Suspense>
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
  count,
  type,
}: {
  icon: ReactNode;
  name: string;
  count: number;
  type?: (typeof TopologyViewTypes)[number];
}) => {
  const matches = useMatches();
  const currentPathName = matches[matches.length - 1]?.pathname ?? '';
  const layoutType = currentPathName.includes('/table') ? 'table' : 'graph';
  const isActive =
    (currentPathName.endsWith('table') || currentPathName.endsWith('graph')) &&
    type === 'cloud_provider'
      ? true
      : currentPathName.endsWith(type || '');
  return (
    <Link
      to={generatePath('/topology/:layoutType/:viewType', {
        layoutType: layoutType,
        viewType: type || '',
      })}
      className={classNames(
        'flex gap-1 items-center text-base font-normal rounded-lg h-full px-2 shrink justify-end min-w-0 relative',
        {
          ['text-gray-700 dark:text-gray-400']: !type,
          ['text-blue-600 dark:text-blue-500']: !!type,
          'bg-blue-100 dark:bg-blue-900 rounded-md transition ease-in-out delay-150':
            isActive,
        },
      )}
      onClick={(e) => {
        if (!type) e.preventDefault();
      }}
    >
      <div
        className={classNames('h-6 w-6 shrink-0', {
          'text-blue-700 dark:text-blue-200 transition ease-in-out delay-150': isActive,
        })}
      >
        {icon}
      </div>
      <div
        className={classNames('shrink', {
          'text-blue-700 dark:text-blue-200 transition ease-in-out delay-150': isActive,
        })}
      >
        {count}
      </div>
      <div
        className={classNames('font-normal truncate', {
          'text-blue-700 dark:text-blue-200 transition ease-in-out delay-150': isActive,
        })}
      >
        {name}
      </div>
    </Link>
  );
};

const ViewSwitcher = () => {
  const params = useParams();
  const location = useLocation();

  const type = params.viewType ?? 'cloud_provider';
  const isGraphView = location.pathname.includes('graph');
  return (
    <div className="flex h-full">
      <Tooltip
        content={'Graph View'}
        triggerAsChild
        placement="bottom"
        delayDuration={200}
      >
        <Link
          to={`/topology/graph/${type}`}
          type="button"
          className={classNames(
            'flex items-center text-lg font-semibold rounded-l-lg h-full px-2 border border-blue-200 dark:border-blue-800',
            {
              ['text-blue-600 dark:text-blue-500']: !isGraphView,
              ['bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border-0 transition ease-in-out delay-150']:
                isGraphView,
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
          to={`/topology/table/${type}`}
          type="button"
          className={classNames(
            'flex items-center text-lg font-semibold rounded-r-lg h-full px-2 border border-blue-200 dark:border-blue-800',
            {
              ['text-blue-600 dark:text-blue-500']: isGraphView,
              ['bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border-0 transition ease-in-out delay-150']:
                !isGraphView,
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
