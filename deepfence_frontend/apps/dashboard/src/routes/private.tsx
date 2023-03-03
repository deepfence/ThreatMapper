import { Outlet } from 'react-router-dom';

import { ErrorComponent } from '@/components/error/ErrorComponent';
import { DashboardLayout } from '@/features/dashboard/layouts/DashboardLayout';
import { dashboardLoader } from '@/features/dashboard/loaders/dashboardLoader';
import { Dashboard } from '@/features/dashboard/pages/Dashboard';
import { module as integrations } from '@/features/integrations/pages/Integrations';
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
import { module as complianceScanConfigure } from '@/features/onboard/pages/ComplianceScanConfigure';
import { module as complianceScanSummary } from '@/features/onboard/pages/ComplianceScanSummary';
import { AddConnector } from '@/features/onboard/pages/connectors/AddConnectors';
import { module as myConnectors } from '@/features/onboard/pages/connectors/MyConnectors';
import { DockerConnector } from '@/features/onboard/pages/DockerConnector';
import { module as dockerRegistryConnector } from '@/features/onboard/pages/DockerRegistryConnector';
import { GCPConnector } from '@/features/onboard/pages/GCPConnector';
import { K8sConnector } from '@/features/onboard/pages/K8sConnector';
import { LinuxConnector } from '@/features/onboard/pages/LinuxConnector';
import { module as malwareScanConfigure } from '@/features/onboard/pages/MalwareScanConfigure';
import { module as malwareScanSumary } from '@/features/onboard/pages/MalwareScanSummary';
import { module as scanInProgress } from '@/features/onboard/pages/ScanInProgress';
import { module as secretScanConfigure } from '@/features/onboard/pages/SecretScanConfigure';
import { module as secretScanSumary } from '@/features/onboard/pages/SecretScanSummary';
import { module as vulnerabilityScanConfigure } from '@/features/onboard/pages/VulnerabilityScanConfigure';
import { module as vulnerabilityScanSumary } from '@/features/onboard/pages/VulnerabilityScanSummary';
import { Registries } from '@/features/registries/pages/Registries';
import { sbomApiLoader } from '@/features/vulnerabilities/api/sbomApiLoader';
import { scanHistoryApiLoader } from '@/features/vulnerabilities/api/scanHistoryApiLoader';
import { module as mostExploitableVulnerabilities } from '@/features/vulnerabilities/pages/MostExploitableVulnerabilities';
import { module as runtimeBom } from '@/features/vulnerabilities/pages/RuntimeBom';
import { module as uniqueVulnerabilities } from '@/features/vulnerabilities/pages/UniqueVulnerabilities';
import { module as vulnerability } from '@/features/vulnerabilities/pages/Vulnerability';
import { module as vulnerabilityDetails } from '@/features/vulnerabilities/pages/VulnerabilityDetailModal';
import { module as vulnerabilityScanResults } from '@/features/vulnerabilities/pages/VulnerabilityScanResults';
import { module as vulnerabilityScans } from '@/features/vulnerabilities/pages/VulnerabilityScans';
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
            path: 'registry-amazon-ecr',
            element: <AmazonECRConnector />,
            meta: { title: 'Connect ECR Registry' },
          },
          {
            path: 'registry-docker',
            ...dockerRegistryConnector,
            meta: { title: 'Docker Container Registry' },
          },
        ],
      },
      {
        path: 'scan',
        children: [
          {
            path: 'choose',
            ...chooseScan,
            meta: { title: 'Choose scan type' },
          },
          {
            path: 'configure/compliance/:controls?',
            ...complianceScanConfigure,
            meta: { title: 'Configure Compliance Scan' },
          },
          {
            path: 'configure/vulnerability',
            ...vulnerabilityScanConfigure,
            meta: { title: 'Configure Vulnerability Scan' },
          },
          {
            path: 'configure/secret',
            ...secretScanConfigure,
            meta: { title: 'Configure Secret Scan' },
          },
          {
            path: 'configure/malware',
            ...malwareScanConfigure,
            meta: { title: 'Configure Malware Scan' },
          },
          {
            path: 'view-summary/compliance/:nodeType/:bulkScanId',
            ...complianceScanSummary,
            meta: { title: 'Summary Compliance Scan' },
          },
          {
            path: 'view-summary/vulnerability/:nodeType/:bulkScanId',
            ...vulnerabilityScanSumary,
            meta: { title: 'Summary Vulnerability Scan' },
          },
          {
            path: 'view-summary/secret/:nodeType/:bulkScanId',
            ...secretScanSumary,
            meta: { title: 'Summary Secret Scan' },
          },
          {
            path: 'view-summary/malware/:nodeType/:bulkScanId',
            ...malwareScanSumary,
            meta: { title: 'Summary Malware Scan' },
          },
          {
            path: 'view-summary/running/:nodeType/:scanType/:bulkScanId',
            ...scanInProgress,
            meta: { title: 'Scan Summary' },
          },
        ],
      },
    ],
  },
  {
    path: '/',
    loader: dashboardLoader,
    element: <DashboardLayout />,
    errorElement: <ErrorComponent />,
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
        meta: { title: 'Dashboard' },
      },
      {
        path: 'registries',
        element: <Registries />,
        meta: { title: 'Registries' },
      },
      {
        path: 'integrations',
        ...integrations,
        meta: { title: 'Integrations' },
      },
      {
        path: 'vulnerability',
        ...vulnerability,
        meta: { title: 'Vulnerability' },
      },
      {
        path: 'vulnerability/scans',
        ...vulnerabilityScans,
        meta: { title: 'Vulnerability Scans' },
      },
      {
        path: 'vulnerability/scan-results/:scanId',
        ...vulnerabilityScanResults,
        meta: { title: 'Vulnerability Scan Results' },
        children: [
          {
            path: ':cveId',
            ...vulnerabilityDetails,
            meta: { title: 'Vulnerability Details' },
          },
        ],
      },
      {
        path: 'vulnerability/most-exploitable',
        ...mostExploitableVulnerabilities,
        meta: { title: 'Most Exploitable Vulnerabilities' },
        children: [
          {
            path: ':cveId',
            ...vulnerabilityDetails,
            meta: { title: 'Most Exploitable Vulnerability Details' },
          },
        ],
      },
      {
        path: 'vulnerability/unique-vulnerabilities',
        ...uniqueVulnerabilities,
        meta: { title: 'Unique Vulnerabilities' },
        children: [
          {
            path: ':cveId',
            ...vulnerabilityDetails,
            meta: { title: 'Unique Vulnerability Details' },
          },
        ],
      },
      {
        path: 'vulnerability/rbom',
        ...runtimeBom,
        meta: { title: 'Runtime BOM' },
      },
    ],
  },
  {
    path: '/_api',
    children: [
      {
        path: 'vulnerability',
        children: [
          {
            path: 'scan-history/:nodeType/:nodeId',
            loader: scanHistoryApiLoader,
          },
          {
            path: 'sbom/:scanId',
            loader: sbomApiLoader,
          },
        ],
      },
    ],
  },
];
