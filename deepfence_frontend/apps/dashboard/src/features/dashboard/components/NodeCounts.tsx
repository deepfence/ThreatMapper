import { useSuspenseQuery } from '@suspensive/react-query';
import { ReactNode, Suspense } from 'react';
import { Card } from 'ui-components';

import { SearchNodeCountResp } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { BlocksGroupLineIcon } from '@/components/icons/common/BlocksGroupLine';
import { CloudLine } from '@/components/icons/common/CloudLine';
import { NodesLineIcon } from '@/components/icons/common/NodesLine';
import { ContainerIcon } from '@/components/icons/container';
import { HostIcon } from '@/components/icons/host';
import { ImageIcon } from '@/components/icons/image';
import { NamespaceIcon } from '@/components/icons/namespace';
import { PodIcon } from '@/components/icons/pod';
import { RegistryIcon } from '@/components/sideNavigation/icons/Registry';
import { CardHeader } from '@/features/dashboard/components/CardHeader';
import { queries } from '@/queries';
import { abbreviateNumber } from '@/utils/number';

function useNodeCounts() {
  return {
    nodeCountQueryRes: useSuspenseQuery({
      ...queries.search.nodeCounts(),
    }),
    registrySummaryQueryRes: useSuspenseQuery({
      ...queries.registry.registrySummary(),
    }),
  };
}

const ITEMS: Array<{
  title: string;
  icon: ReactNode;
  key: keyof SearchNodeCountResp | 'registry';
  link: string;
}> = [
  {
    title: 'Cloud providers',
    icon: <CloudLine />,
    key: 'cloud_provider',
    link: '/inventory/compute/cloud_provider/graph',
  },
  {
    title: 'Hosts',
    icon: <HostIcon />,
    key: 'host',
    link: '/inventory/compute/host/graph',
  },
  {
    title: 'Clusters',
    icon: <NodesLineIcon />,
    key: 'kubernetes_cluster',
    link: '/inventory/compute/kubernetes_cluster/graph',
  },
  {
    title: 'Pods',
    icon: <PodIcon />,
    key: 'pod',
    link: '/inventory/compute/pod/graph',
  },
  {
    title: 'Containers',
    icon: <ContainerIcon />,
    key: 'container',
    link: '/inventory/compute/container/graph',
  },
  {
    title: 'Namespaces',
    icon: <NamespaceIcon />,
    key: 'namespace',
    link: '/inventory/compute/graph/kubernetes_cluster',
  },
  {
    title: 'Registries',
    icon: <RegistryIcon />,
    key: 'registry',
    link: '/registries',
  },
  {
    title: 'Container Images',
    icon: <ImageIcon />,
    key: 'container_image',
    link: '/registries',
  },
];

export const NodeCounts = () => {
  return (
    <Card className="rounded-[5px]">
      <CardHeader icon={<BlocksGroupLineIcon />} title="Inventory" />
      <div className="py-5 px-10 grid grid-cols-4 lg:grid-cols-8 gap-6">
        <Suspense
          fallback={ITEMS.map((item) => {
            return <CountCardSkeleton {...item} key={item.key} />;
          })}
        >
          <NodeCountList />
        </Suspense>
      </div>
    </Card>
  );
};

const NodeCountList = () => {
  const {
    nodeCountQueryRes: { data: nodeCountsData },
    registrySummaryQueryRes: { data: registrySummaryData },
  } = useNodeCounts();

  return (
    <>
      {ITEMS.map((data) => {
        return (
          <CountCard
            key={data.title}
            title={data.title}
            count={
              data.key === 'registry'
                ? registrySummaryData.reduce((prev, curr) => {
                    return prev + (curr.registries ?? 0);
                  }, 0)
                : nodeCountsData[data.key]
            }
            icon={data.icon}
            link={data.link}
          />
        );
      })}
    </>
  );
};

const CountCard = ({
  title,
  icon,
  count,
  link,
}: {
  title: string;
  icon: ReactNode;
  count: number;
  link: string;
}) => {
  return (
    <DFLink
      to={link}
      unstyled
      className="group flex flex-col gap-1 cursor-pointer"
      data-testid={`link${title}Id`}
    >
      <div
        className="text-p12 text-text-text-and-icon truncate"
        data-testid={`${title}Id`}
      >
        {title}
      </div>
      <div className="flex gap-3 items-center">
        <div className="h-6 w-6 shrink-0 text-text-icon">{icon}</div>
        <div
          className="text-h1 text-accent-accent group-hover:underline"
          data-testid={`${title}CountId`}
        >
          {abbreviateNumber(count)}
        </div>
      </div>
    </DFLink>
  );
};

const CountCardSkeleton = ({
  title,
  icon,
  link,
}: {
  title: string;
  icon: ReactNode;
  link: string;
}) => {
  return (
    <DFLink to={link} unstyled className="flex flex-col gap-1 cursor-pointer">
      <div className="text-p12 text-text-text-and-icon">{title}</div>
      <div className="flex gap-3 items-center">
        <div className="h-6 w-6 shrink-0 text-text-icon">{icon}</div>
        <div className="h-9 w-12 dark:bg-accent-accent bg-bg-grid-border opacity-30 rounded" />
      </div>
    </DFLink>
  );
};
