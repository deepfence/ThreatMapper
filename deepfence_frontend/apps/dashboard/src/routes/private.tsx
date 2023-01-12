import { Outlet, RouteObject } from 'react-router-dom';

import {
  OnboardLayout,
  rootOnboardLoader,
} from '../features/onboard/layouts/OnboardLayout';
import { AWSConnector } from '../features/onboard/pages/AWSConnector';
import { Connector } from '../features/onboard/pages/Connector';

export const privateRoutes: RouteObject[] = [
  {
    path: '/onboard',
    element: <OnboardLayout />,
    loader: rootOnboardLoader,
    children: [
      {
        path: 'connectors',
        element: <Outlet />,
        children: [
          {
            index: true,
            element: <Connector />,
          },
          {
            path: 'cloud/aws',
            element: <AWSConnector />,
          },
        ],
      },
    ],
  },
];
