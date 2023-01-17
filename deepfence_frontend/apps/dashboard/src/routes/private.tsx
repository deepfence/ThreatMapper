import { Outlet, RouteObject } from 'react-router-dom';

import {
  OnboardLayout,
  rootOnboardLoader,
} from '../features/onboard/layouts/OnboardLayout';
import { AmazonECRConnector } from '../features/onboard/pages/AmazonECRConnector';
import { AWSConnector } from '../features/onboard/pages/AWSConnector';
import { AzureConnector } from '../features/onboard/pages/AzureConnector';
import { Connector } from '../features/onboard/pages/Connector';
import { DockerConnector } from '../features/onboard/pages/DockerConnector';
import { GCPConnector } from '../features/onboard/pages/GCPConnector';
import { K8sConnector } from '../features/onboard/pages/K8sConnector';
import { LinuxConnector } from '../features/onboard/pages/LinuxConnector';

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
          {
            path: 'host/k8s',
            element: <K8sConnector />,
          },
          {
            path: 'docker',
            element: <DockerConnector />,
          },
          {
            path: 'host-linux',
            element: <LinuxConnector />,
          },
          {
            path: 'registry/amazon-ecr',
            element: <AmazonECRConnector />,
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
