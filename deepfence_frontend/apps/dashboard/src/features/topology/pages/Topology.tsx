import { LoaderFunctionArgs, Outlet, redirect } from 'react-router-dom';

import { TopologyHeader } from '@/features/topology/components/TopologyHeader';

const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (
    ['/topology', '/topology/', '/topology/cloud', '/topology/cloud/'].includes(
      url.pathname,
    )
  ) {
    return redirect('/topology/cloud/table', 302);
  }
  return null;
};

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
  loader,
  element: <Topology />,
};
