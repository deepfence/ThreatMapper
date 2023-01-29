import { createBrowserRouter } from 'react-router-dom';

import { privateRoutes } from '@/routes/private';
import { publicRoutes } from '@/routes/public';

const notFoundRoute = [
  {
    path: '*',
    element: '404 Not Found',
  },
];

export const router = createBrowserRouter([
  ...privateRoutes,
  ...publicRoutes,
  ...notFoundRoute,
]);
