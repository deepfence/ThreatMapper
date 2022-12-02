import { createBrowserRouter } from 'react-router-dom';
import { Error } from 'ui-components';

import { protectedRoutes } from './protected';
import { unprotectedRoutes } from './unprotected';

const notFoundRoute = [
  {
    path: '*',
    element: <Error errorType="notFound" />,
  },
];

export const router = createBrowserRouter([
  ...protectedRoutes,
  ...unprotectedRoutes,
  ...notFoundRoute,
]);
