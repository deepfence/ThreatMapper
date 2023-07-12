import { useEffect } from 'react';
import { createBrowserRouter, Outlet, useNavigate } from 'react-router-dom';

import { FourZeroFour } from '@/components/error/404';
import { privateRoutes } from '@/routes/private';
import { publicRoutes } from '@/routes/public';
import { historyHelper } from '@/utils/router';

const notFoundRoute = [
  {
    path: '*',
    element: <FourZeroFour />,
  },
];

export const router = createBrowserRouter([
  {
    path: '/',
    Component: SetupGlobalNavigateComponent,
    children: [...privateRoutes, ...publicRoutes, ...notFoundRoute],
  },
]);

function SetupGlobalNavigateComponent() {
  const navigate = useNavigate();
  useEffect(() => {
    // we store navigate function here on global object so we can use it outside of react context
    // other option is using router.navigate but that is private method and because of circular dependancy
    // it is breaking vite hmr.
    historyHelper.navigate = navigate;
  }, [navigate]);
  return <Outlet />;
}
