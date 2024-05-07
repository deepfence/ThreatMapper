import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Tabs } from 'ui-components';

import { TopologyHeader } from '@/features/topology/components/TopologyHeader';
import { CloudResourcesTable } from '@/features/topology/data-components/tables/CloudResourcesTable';
import { queries } from '@/queries';

function useCloudResourcesCount() {
  return useSuspenseQuery({ ...queries.search.cloudResourcesCount() });
}

const CloudResourceCount = () => {
  const { data: cloudResourceCount } = useCloudResourcesCount();
  return <b>{cloudResourceCount}</b>;
};

const inventoryTabs = [
  {
    label: 'Compute',
    value: 'compute',
  },
  {
    label: 'API',
    value: 'api',
  },
  {
    label: 'LLM',
    value: 'llm',
  },
  {
    label: 'Cloud Resources',
    value: 'cloud_resource',
    icon: (
      <Suspense fallback={0}>
        <CloudResourceCount />
      </Suspense>
    ),
  },
];

function InventoryTabs() {
  const [tab, setTab] = useState<'compute' | 'api' | 'llm' | 'cloud_resource'>('compute');
  return (
    <Tabs
      value={tab}
      defaultValue={tab}
      tabs={inventoryTabs}
      onValueChange={(v) => {
        setTab(v as any);
      }}
      fullWidth={true}
    >
      {tab === 'compute' ? <TopologyHeader /> : null}
      {tab === 'cloud_resource' ? <CloudResourcesTable /> : null}
    </Tabs>
  );
}

function Topology() {
  return (
    <div className="h-full flex flex-col">
      <InventoryTabs />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}

export const module = {
  element: <Topology />,
};
