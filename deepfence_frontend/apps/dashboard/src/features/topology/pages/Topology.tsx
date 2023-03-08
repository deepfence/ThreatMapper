import { Outlet } from 'react-router-dom';

import { TopologyHeader } from '@/features/topology/components/TopologyHeader';

function Topology() {
  return (
    <div>
      <TopologyHeader />
      <div className="m-2">
        <Outlet />
      </div>
    </div>
  );
}

export const module = {
  element: <Topology />,
};
