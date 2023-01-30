import { Outlet } from 'react-router-dom';

import { dashboardLoader } from '@/features/dashboard/loaders/dashboardLoader';
import {
  ConnectorsLayout,
  connectorsLoader,
} from '@/features/onboard/layouts/ConnectorsLayout';
import {
  OnboardLayout,
  rootOnboardLoader,
} from '@/features/onboard/layouts/OnboardLayout';
import { AmazonECRConnector } from '@/features/onboard/pages/AmazonECRConnector';
import { AWSConnector } from '@/features/onboard/pages/AWSConnector';
import { AzureConnector } from '@/features/onboard/pages/AzureConnector';
import { module as chooseScan } from '@/features/onboard/pages/ChooseScan';
import { ComplianceScanConfigure } from '@/features/onboard/pages/ComplianceScanConfigure';
import { ComplianceScanSummary } from '@/features/onboard/pages/ComplianceScanSummary';
import { AddConnector } from '@/features/onboard/pages/connectors/AddConnectors';
import { module as myConnectors } from '@/features/onboard/pages/connectors/MyConnectors';
import { DockerConnector } from '@/features/onboard/pages/DockerConnector';
import { GCPConnector } from '@/features/onboard/pages/GCPConnector';
import { K8sConnector } from '@/features/onboard/pages/K8sConnector';
import { LinuxConnector } from '@/features/onboard/pages/LinuxConnector';
import {
  ScanInProgress,
  ScanInProgressError,
  scanStatusLoader,
} from '@/features/onboard/pages/ScanInProgress';
import { SecretScanConfigure } from '@/features/onboard/pages/SecretScanConfigure';
import {
  startVulnerabilityScanAction,
  VulnerabilityScanConfigure,
} from '@/features/onboard/pages/VulnerabilityScanConfigure';
import { CustomRouteObject } from '@/utils/router';

export const privateRoutes: CustomRouteObject[] = [
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
            meta: { title: 'Add Connectors' },
          },
          {
            path: 'my-connectors',
            ...myConnectors,
            meta: { title: 'My Connectors' },
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
            meta: { title: 'Connect AWS Account' },
          },
          {
            path: 'cloud/gcp',
            element: <GCPConnector />,
            meta: { title: 'Connect GCP Account' },
          },
          {
            path: 'cloud/azure',
            element: <AzureConnector />,
            meta: { title: 'Connect Azure Account' },
          },
          {
            path: 'host/k8s',
            element: <K8sConnector />,
            meta: { title: 'Connect K8S Cluster' },
          },
          {
            path: 'host/docker',
            element: <DockerConnector />,
            meta: { title: 'Connect Docker Container' },
          },
          {
            path: 'host/linux',
            element: <LinuxConnector />,
            meta: { title: 'Connect Linux Machine' },
          },
          {
            path: 'registry/amazon-ecr',
            element: <AmazonECRConnector />,
            meta: { title: 'Connect ECR Registry' },
          },
        ],
      },
      {
        path: 'scan',
        children: [
          {
            path: 'choose/:nodeType/:nodeIds',
            ...chooseScan,
            meta: { title: 'Choose scan type' },
          },
          {
            path: 'configure/compliance',
            element: <ComplianceScanConfigure />,
            meta: { title: 'Configure Compliance Scan' },
          },
          {
            path: 'configure/vulnerability/:nodeType/:nodeId',
            element: <VulnerabilityScanConfigure />,
            action: startVulnerabilityScanAction,
            meta: { title: 'Configure Vulnerability Scan' },
          },
          {
            path: 'configure/secret',
            element: <SecretScanConfigure />,
            meta: { title: 'Configure Secret Scan' },
          },
          {
            path: 'view-summary/compliance',
            element: <ComplianceScanSummary />,
            meta: { title: 'Configure Compliance Scan' },
          },
          {
            path: 'view-summary/running/:nodeId/:nodeType/:scanType/:scanId',
            element: <ScanInProgress />,
            errorElement: <ScanInProgressError />,
            loader: scanStatusLoader,
            meta: { title: 'Scan Summary' },
          },
        ],
      },
    ],
  },
  {
    path: '/',
    loader: dashboardLoader,
  },
];
