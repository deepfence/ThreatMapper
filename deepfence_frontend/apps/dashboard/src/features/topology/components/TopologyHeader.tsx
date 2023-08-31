import { useSuspenseQuery } from '@suspensive/react-query';
import { ReactNode, Suspense } from 'react';
import { generatePath, Link, useLocation, useMatches, useParams } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import { Tooltip } from 'ui-components';

import { SearchNodeCountResp } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { CloudServicesIcon } from '@/components/icons/cloudService';
import { CloudLine } from '@/components/icons/common/CloudLine';
import { NodesLineIcon } from '@/components/icons/common/NodesLine';
import { OrganizationLineIcon } from '@/components/icons/common/OrganizationLine';
import { ContainerIcon } from '@/components/icons/container';
import { HostIcon } from '@/components/icons/host';
import { PodIcon } from '@/components/icons/pod';
import { TableIcon } from '@/components/icons/table';
import { NodeType } from '@/features/topology/utils/topology-data';
import { queries } from '@/queries';

const SummaryTab = ({
  icon,
  name,
  count,
  type,
}: {
  icon: ReactNode;
  name: string;
  count: ReactNode;
  type?: string;
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
        tabIndex={-1}
      >
        <div className="h-[16px] w-[16px]">{icon}</div>
        <div>
          <span className={`${isActive ? 'text-h5' : 'text-h6'}`}>{count}</span> {name}
        </div>
      </button>
    </DFLink>
  );
};

function useNodeCounts() {
  return useSuspenseQuery({ ...queries.search.nodeCounts() });
}
function useCloudResourcesCount() {
  return useSuspenseQuery({ ...queries.search.cloudResourcesCount() });
}

const NodeCount = ({ type }: { type: keyof SearchNodeCountResp }) => {
  const { data } = useNodeCounts();
  return <>{data[type]}</>;
};

const CloudResourceCount = () => {
  const { data: cloudResourceCount } = useCloudResourcesCount();
  return <>{cloudResourceCount}</>;
};

export const TopologyHeader = () => {
  const params = useParams();
  const viewType = params.viewType;
  return (
    <div className="flex items-center dark:text-text-text-and-icon text-p1 px-3 dark:bg-bg-breadcrumb-bar">
      <SummaryTab
        icon={<CloudLine />}
        name="Clouds"
        type={NodeType.cloud_provider}
        count={
          <Suspense fallback={0}>
            <NodeCount type="cloud_provider" />
          </Suspense>
        }
      />
      <SummaryTab
        icon={<HostIcon />}
        name="Hosts"
        type={NodeType.host}
        count={
          <Suspense fallback={0}>
            <NodeCount type="host" />
          </Suspense>
        }
      />
      <SummaryTab
        icon={<NodesLineIcon />}
        name="Kubernetes Clusters"
        type={NodeType.kubernetes_cluster}
        count={
          <Suspense fallback={0}>
            <NodeCount type="kubernetes_cluster" />
          </Suspense>
        }
      />
      <SummaryTab
        icon={<ContainerIcon />}
        name="Containers"
        type={NodeType.container}
        count={
          <Suspense fallback={0}>
            <NodeCount type="container" />
          </Suspense>
        }
      />
      <SummaryTab
        icon={<PodIcon />}
        name="Pods"
        type={NodeType.pod}
        count={
          <Suspense fallback={0}>
            <NodeCount type="pod" />
          </Suspense>
        }
      />
      <SummaryTab
        icon={<CloudServicesIcon />}
        name="Cloud Resources"
        type={'cloud_resource'}
        count={
          <Suspense fallback={0}>
            <CloudResourceCount />
          </Suspense>
        }
      />
      {viewType !== 'cloud_resource' ? (
        <div className="ml-auto">
          <ViewSwitcher />
        </div>
      ) : null}
    </div>
  );
};

const ViewSwitcher = () => {
  const params = useParams();
  const location = useLocation();

  const type = params.viewType ?? 'cloud_provider';
  const isGraphView = location.pathname.includes('graph');
  return (
    <div className="flex h-full gap-3">
      <Tooltip
        content={'Graph View'}
        triggerAsChild
        placement="bottom"
        delayDuration={200}
      >
        <Link
          to={`/topology/graph/${type}`}
          type="button"
          className={cn('flex items-center', {
            ['dark:text-text-text-and-icon']: !isGraphView,
            ['dark:text-accent-accent']: isGraphView,
          })}
        >
          <button className="h-6 w-6 shrink-0" tabIndex={-1}>
            <OrganizationLineIcon />
          </button>
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
          className={cn('flex items-center', {
            ['dark:text-text-text-and-icon']: isGraphView,
            ['dark:text-accent-accent']: !isGraphView,
          })}
        >
          <div className="h-6 w-6 shrink-0" tabIndex={-1}>
            <TableIcon />
          </div>
        </Link>
      </Tooltip>
    </div>
  );
};
