import { Outlet } from 'react-router-dom';

import { TopologyHeader } from '@/features/topology/components/TopologyHeader';

function Topology() {
  return (
    <div className="h-full flex flex-col">
      <TopologyHeader />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}

export const module = {
  element: <Topology />,
};
