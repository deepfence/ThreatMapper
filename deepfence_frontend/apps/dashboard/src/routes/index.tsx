import { createBrowserRouter } from 'react-router-dom';

import { privateRoutes } from '@/routes/private';
import { publicRoutes } from '@/routes/public';

const notFoundRoute = [
  {
    path: '*',
    element: '//TODO change me',
  },
];

export const router = createBrowserRouter([
  ...privateRoutes,
  ...publicRoutes,
  ...notFoundRoute,
]);
