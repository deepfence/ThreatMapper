import { ReactNode, Suspense } from 'react';
import { generatePath, Link, useLocation, useMatches, useParams } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import { Tooltip } from 'ui-components';

import { SearchNodeCountResp } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { CloudLine } from '@/components/icons/common/CloudLine';
import { GraphIcon } from '@/components/icons/graph';
import { TableIcon } from '@/components/icons/table';
import { TopologyViewTypes } from '@/features/topology/data-components/topologyLoader';
import { NodeType } from '@/features/topology/utils/topology-data';
import { DFAwait } from '@/utils/suspense';

const SummaryTab = ({
  icon,
  name,
  count,
  type,
}: {
  icon: ReactNode;
  name: string;
  count: ReactNode;
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
    <DFLink
      to={generatePath('/topology/:layoutType/:viewType', {
        layoutType: layoutType,
        viewType: type || '',
      })}
      style={{
        all: 'unset',
      }}
    >
      <button
        className={cn(
          `flex items-center gap-[6px] p-3 dark:hover:text-text-input-value dark:hover:bg-bg-grid-header`,
          'dark:hover:shadow-[0_-4px_0_var(--tw-shadow-color)_inset] dark:shadow-accent-accent transition-shadow duration-[0.2s] ease-[ease-in]',
          {
            'dark:text-text-input-value dark:bg-bg-active-selection dark:shadow-[0_-4px_0_var(--tw-shadow-color)_inset] dark:hover:bg-bg-active-selection':
              isActive,
          },
        )}
      >
        <div className="h-[16px] w-[16px]">{icon}</div>
        <div>
          <span className={`${isActive ? 'text-h5' : 'text-h6'}`}>{count}</span> {name}
        </div>
      </button>
    </DFLink>
  );
};

export const TopologyHeader = ({ nodeCounts }: { nodeCounts: SearchNodeCountResp }) => {
  return (
    <div className="flex items-center dark:text-text-text-and-icon text-p1 px-3 dark:bg-bg-breadcrumb-bar">
      <SummaryTab
        icon={<CloudLine />}
        name="Clouds"
        type={NodeType.cloud_provider}
        count={
          <Suspense fallback={0}>
            <DFAwait resolve={nodeCounts}>
              {(data: SearchNodeCountResp) => {
                return data.cloud_provider;
              }}
            </DFAwait>
          </Suspense>
        }
      />
      <SummaryTab
        icon={<CloudLine />}
        name="Hosts"
        type={NodeType.host}
        count={
          <Suspense fallback={0}>
            <DFAwait resolve={nodeCounts}>
              {(data: SearchNodeCountResp) => {
                return data.host;
              }}
            </DFAwait>
          </Suspense>
        }
      />
      <SummaryTab
        icon={<CloudLine />}
        name="Kubernetes Clusters"
        type={NodeType.kubernetes_cluster}
        count={
          <Suspense fallback={0}>
            <DFAwait resolve={nodeCounts}>
              {(data: SearchNodeCountResp) => {
                return data.kubernetes_cluster;
              }}
            </DFAwait>
          </Suspense>
        }
      />
      <SummaryTab
        icon={<CloudLine />}
        name="Containers"
        type={NodeType.container}
        count={
          <Suspense fallback={0}>
            <DFAwait resolve={nodeCounts}>
              {(data: SearchNodeCountResp) => {
                return data.container;
              }}
            </DFAwait>
          </Suspense>
        }
      />
      <SummaryTab
        icon={<CloudLine />}
        name="Pods"
        type={NodeType.pod}
        count={
          <Suspense fallback={0}>
            <DFAwait resolve={nodeCounts}>
              {(data: SearchNodeCountResp) => {
                return data.pod;
              }}
            </DFAwait>
          </Suspense>
        }
      />
    </div>
  );
};

// TODO: change this view switcher
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
          className={cn(
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
          className={cn(
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
