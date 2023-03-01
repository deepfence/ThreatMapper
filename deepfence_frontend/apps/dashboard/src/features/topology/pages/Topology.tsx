import { LoaderFunctionArgs, Outlet, redirect } from 'react-router-dom';

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
      <div className="flex flex-col p-2 w-full shadow bg-white dark:bg-gray-800">
        <span className="text-md font-medium text-gray-700 dark:text-gray-200 uppercase">
          Topology
        </span>
      </div>
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
