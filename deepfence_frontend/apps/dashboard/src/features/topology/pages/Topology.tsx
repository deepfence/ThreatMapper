import { Outlet, ShouldRevalidateFunction, useLoaderData } from 'react-router-dom';

import { getSearchApiClient } from '@/api/api';
import { TopologyHeader } from '@/features/topology/components/TopologyHeader';
import { apiWrapper } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';

async function getNodeCounts() {
  const getNodeCountsApi = apiWrapper({
    fn: getSearchApiClient().getNodeCounts,
  });
  const nodeCounts = await getNodeCountsApi();

  if (!nodeCounts.ok) {
    throw new Error('Node counts failed');
  }
  return nodeCounts.value;
}

type LoaderData = {
  nodeCounts: Awaited<ReturnType<typeof getNodeCounts>>;
};

const loader = async (): Promise<TypedDeferredData<LoaderData>> => {
  return typedDefer({ nodeCounts: getNodeCounts() });
};

function Topology() {
  const data = useLoaderData() as LoaderData;
  return (
    <div className="h-full flex flex-col">
      <TopologyHeader nodeCounts={data.nodeCounts} />
      <div className="p-2 flex-1">
        <Outlet />
      </div>
    </div>
  );
}

const shouldRevalidate: ShouldRevalidateFunction = () => {
  return false;
};

export const module = {
  element: <Topology />,
  loader,
  shouldRevalidate,
};
