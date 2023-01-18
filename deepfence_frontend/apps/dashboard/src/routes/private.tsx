import { Outlet, RouteObject } from 'react-router-dom';

import {
  ConnectorsLayout,
  connectorsLoader,
} from '../features/onboard/layouts/ConnectorsLayout';
import {
  OnboardLayout,
  rootOnboardLoader,
} from '../features/onboard/layouts/OnboardLayout';
import { AmazonECRConnector } from '../features/onboard/pages/AmazonECRConnector';
import { AWSConnector } from '../features/onboard/pages/AWSConnector';
import { AzureConnector } from '../features/onboard/pages/AzureConnector';
import { AddConnector } from '../features/onboard/pages/connectors/AddConnectors';
import { MyConnectors } from '../features/onboard/pages/connectors/MyConnectors';
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
        path: 'connectors',
        element: <ConnectorsLayout />,
        loader: connectorsLoader,
        children: [
          {
            path: 'add-connectors',
            element: <AddConnector />,
          },
          {
            path: 'my-connectors',
            element: <MyConnectors />,
          },
        ],
      },
      {
        path: 'instructions',
        element: <Outlet />,
        children: [
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
    ],
  },
];
