import { createBrowserRouter } from 'react-router-dom';

import { privateRoutes } from './private';
import { publicRoutes } from './public';

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
