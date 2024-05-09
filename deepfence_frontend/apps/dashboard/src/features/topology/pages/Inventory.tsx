import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useState } from 'react';
import { generatePath, Outlet, useMatches, useParams } from 'react-router-dom';
import { Tabs } from 'ui-components';

import { TopologyHeader } from '@/features/topology/components/TopologyHeader';
import { queries } from '@/queries';
import { usePageNavigation } from '@/utils/usePageNavigation';

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
  const matches = useMatches();
  const params = useParams();
  const { navigate } = usePageNavigation();
  const [tab, setTab] = useState<string>('');
  const nodeType = params.viewType ?? 'cloud_provider';

  useEffect(() => {
    const currentPathName = matches[matches.length - 1]?.pathname ?? '';
    if (currentPathName.includes('compute')) {
      setTab('compute');
    } else {
      setTab(currentPathName.split('/')?.pop() as string);
    }
  }, [matches]);

  return (
    <Tabs
      value={tab}
      defaultValue={tab}
      tabs={inventoryTabs}
      onValueChange={(value) => {
        setTab(value);
        const currentPathName = matches[matches.length - 1]?.pathname ?? '';
        const visualType = currentPathName.includes('/table') ? 'table' : 'graph';

        if (value.includes('compute')) {
          const path = generatePath('compute/:viewType/:visualLayout', {
            viewType: nodeType,
            visualLayout: visualType,
          });
          navigate(path);
        } else {
          navigate(value);
        }
      }}
      fullWidth={true}
    >
      {tab === 'compute' ? <TopologyHeader /> : null}
    </Tabs>
  );
}

function Inventory() {
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
  element: <Inventory />,
};
