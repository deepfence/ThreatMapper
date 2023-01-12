import { Outlet, RouteObject } from 'react-router-dom';

import {
  OnboardLayout,
  rootOnboardLoader,
} from '../features/onboard/layouts/OnboardLayout';
import { AWSConnector } from '../features/onboard/pages/AWSConnector';
import { AzureConnector } from '../features/onboard/pages/AzureConnector';
import { Connector } from '../features/onboard/pages/Connector';
import { GCPConnector } from '../features/onboard/pages/GCPConnector';

export const privateRoutes: RouteObject[] = [
  {
    path: '/onboard',
    element: <OnboardLayout />,
    loader: rootOnboardLoader,
    children: [
      {
        path: 'add-connectors',
        element: <Outlet />,
        children: [
          {
            index: true,
            element: <Connector page="add-connectors" />,
          },
          {
            path: 'cloud/aws',
            element: <AWSConnector />,
          },
          {
            path: 'cloud/gcp',
            element: <GCPConnector />,
          },
          {
            path: 'cloud/azure',
            element: <AzureConnector />,
          },
        ],
      },
      {
        path: 'my-connectors',
        element: <Outlet />,
        children: [
          {
            index: true,
            element: <Connector page="my-connectors" />,
          },
        ],
      },
    ],
  },
];
