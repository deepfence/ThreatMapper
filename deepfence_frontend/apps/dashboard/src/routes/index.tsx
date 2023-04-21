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

export const router = createBrowserRouter([
  ...privateRoutes,
  ...publicRoutes,
  ...notFoundRoute,
]);
