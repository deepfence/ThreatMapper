import { createBrowserRouter } from 'react-router-dom';

import { FourZeroFour } from '@/components/error/404';
import { privateRoutes } from '@/routes/private';
import { publicRoutes } from '@/routes/public';

const notFoundRoute = [
  {
    path: '*',
    element: <FourZeroFour />,
  },
];

let router: ReturnType<typeof createBrowserRouter>;

// hmr is breaking if we directly export router because of circular dependancy
// https://github.com/vitejs/vite/issues/3033
export function getRouter() {
  if (!router) {
    router = createBrowserRouter([...privateRoutes, ...publicRoutes, ...notFoundRoute]);
  }
  return router;
}
