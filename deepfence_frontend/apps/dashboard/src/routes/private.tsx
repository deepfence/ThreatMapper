import { Outlet } from 'react-router-dom';

import { ErrorComponent } from '@/components/error/ErrorComponent';
import { scanMalwareApiAction } from '@/components/scan-configure-forms/MalwareScanConfigureForm';
import { scanPostureApiAction } from '@/components/scan-configure-forms/PostureScanConfigureForm';
import { scanSecretApiAction } from '@/components/scan-configure-forms/SecretScanConfigureForm';
import { scanVulnerabilityApiAction } from '@/components/scan-configure-forms/VulnerabilityScanConfigureForm';
import { registryConnectorActionApi } from '@/features/common/data-component/RegistryConnectorForm';
import { scanHistoryApiLoader } from '@/features/common/data-component/scanHistoryApiLoader';
import { searchClustersApiLoader } from '@/features/common/data-component/searchClustersApiLoader';
import { searchContainerImagesApiLoader } from '@/features/common/data-component/searchContainerImagesApiLoader';
import { searchContainersApiLoader } from '@/features/common/data-component/searchContainersApiLoader';
import { searchHostsApiLoader } from '@/features/common/data-component/searchHostsApiLoader';
import { DashboardLayout } from '@/features/dashboard/layouts/DashboardLayout';
import { dashboardLoader } from '@/features/dashboard/loaders/dashboardLoader';
import { Dashboard } from '@/features/dashboard/pages/Dashboard';
import { module as integrations } from '@/features/integrations/pages/Integrations';
import { module as malware } from '@/features/malwares/pages/Malware';
import { module as malwareDetails } from '@/features/malwares/pages/MalwareDetailModal';
import { module as malwareScanResults } from '@/features/malwares/pages/MalwareScanResults';
import { module as malwareScans } from '@/features/malwares/pages/MalwareScans';
import {
  ConnectorsLayout,
  connectorsLoader,
} from '@/features/onboard/layouts/ConnectorsLayout';
import {
  OnboardLayout,
  rootOnboardLoader,
} from '@/features/onboard/layouts/OnboardLayout';
import { module as registriesConnector } from '@/features/onboard/pages//RegistriesConnector';
import { AWSConnector } from '@/features/onboard/pages/AWSConnector';
import { AzureConnector } from '@/features/onboard/pages/AzureConnector';
import { module as chooseScan } from '@/features/onboard/pages/ChooseScan';
import { module as complianceScanSummary } from '@/features/onboard/pages/ComplianceScanSummary';
import { module as configureScanForm } from '@/features/onboard/pages/ConfigureScanForm';
import { AddConnector } from '@/features/onboard/pages/connectors/AddConnectors';
import { module as myConnectors } from '@/features/onboard/pages/connectors/MyConnectors';
import { DockerConnector } from '@/features/onboard/pages/DockerConnector';
import { GCPConnector } from '@/features/onboard/pages/GCPConnector';
import { K8sConnector } from '@/features/onboard/pages/K8sConnector';
import { LinuxConnector } from '@/features/onboard/pages/LinuxConnector';
import { module as malwareScanSumary } from '@/features/onboard/pages/MalwareScanSummary';
import { module as scanInProgress } from '@/features/onboard/pages/ScanInProgress';
import { module as secretScanSumary } from '@/features/onboard/pages/SecretScanSummary';
import { module as vulnerabilityScanSumary } from '@/features/onboard/pages/VulnerabilityScanSummary';
import {
  listControlsApiLoader,
  toggleControlApiAction,
} from '@/features/postures/data-component/listControlsApiLoader';
import { module as postureConnectorLayout } from '@/features/postures/layouts/PostureConnectorLayout';
import { module as postureAccounts } from '@/features/postures/pages/Accounts';
import { module as postureAddAccounts } from '@/features/postures/pages/AddAccount';
import { module as posture } from '@/features/postures/pages/Posture';
import { module as postureScanResults } from '@/features/postures/pages/PostureScanResults';
import { module as registryConnectorLayout } from '@/features/registries/layouts/RegistryConnectorLayout';
import { module as registries } from '@/features/registries/pages/Registries';
import { module as registryAccounts } from '@/features/registries/pages/RegistryAccounts';
import { module as registryAdd } from '@/features/registries/pages/RegistryAdd';
import { module as registryImages } from '@/features/registries/pages/RegistryImages';
import { module as registryImageTags } from '@/features/registries/pages/RegistryImageTags';
import { module as secret } from '@/features/secrets/pages/Secret';
import { module as secretDetails } from '@/features/secrets/pages/SecretDetailModal';
import { module as secretScanResults } from '@/features/secrets/pages/SecretScanResults';
import { module as secretScans } from '@/features/secrets/pages/SecretScans';
import { sbomApiLoader } from '@/features/vulnerabilities/api/sbomApiLoader';
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
            path: ':registryType',
            ...registriesConnector,
            meta: { title: 'Registry Conector' },
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
            path: 'configure/:scanType',
            ...configureScanForm,
            meta: { title: 'Configure Scan' },
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
      // registries
      {
        path: 'registries',
        ...registries,
        meta: { title: 'Registries' },
      },
      {
        path: 'registries/:account',
        ...registryAccounts,
        meta: { title: 'Registry Account' },
      },
      {
        path: 'registries/add',
        ...registryConnectorLayout,
        children: [
          {
            path: ':account',
            ...registryAdd,
            meta: { title: 'Registry Add Account' },
          },
        ],
      },
      {
        path: 'registries/images/:account/:nodeId',
        ...registryImages,
        meta: { title: 'Registries Images' },
      },
      {
        path: 'registries/imagetags/:account/:nodeId/:imageId',
        ...registryImageTags,
        meta: { title: 'Registries Image Tags' },
      },
      // integrations
      {
        path: 'integrations',
        ...integrations,
        meta: { title: 'Integrations' },
      },
      // vulnerability
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
      // secrets
      {
        path: 'secret',
        ...secret,
        meta: { title: 'Secret' },
      },
      {
        path: 'secret/scans',
        ...secretScans,
        meta: { title: 'Secret Scans' },
      },
      {
        path: 'secret/scan-results/:scanId',
        ...secretScanResults,
        meta: { title: 'Secret Scan Results' },
        children: [
          {
            path: ':secretId',
            ...secretDetails,
            meta: { title: 'Secret Details' },
          },
        ],
      },
      // malware
      {
        path: 'malware',
        ...malware,
        meta: { title: 'Malware' },
      },
      {
        path: 'malware/scans',
        ...malwareScans,
        meta: { title: 'Malware Scans' },
      },
      {
        path: 'malware/scan-results/:scanId',
        ...malwareScanResults,
        meta: { title: 'Malware Scan Results' },
        children: [
          {
            path: ':malwareId',
            ...malwareDetails,
            meta: { title: 'Malware Details' },
          },
        ],
      },
      // posture
      {
        path: 'posture',
        ...posture,
        meta: { title: 'Posture' },
      },
      {
        path: 'posture/add-connection',
        ...postureConnectorLayout,
        children: [
          {
            path: 'aws',
            ...postureAddAccounts.aws,
            meta: { title: 'Posture Add AWS Account' },
          },
          {
            path: 'azure',
            ...postureAddAccounts.azure,
            meta: { title: 'Posture Add Azure Account' },
          },
          {
            path: 'gcp',
            ...postureAddAccounts.azure,
            meta: { title: 'Posture Add GCP Account' },
          },
          {
            path: 'kubernetes',
            ...postureAddAccounts.kubernetes,
            meta: { title: 'Posture Add Kubernetes Account' },
          },
          {
            path: 'host',
            ...postureAddAccounts.host,
            meta: { title: 'Posture Add Host Account' },
          },
        ],
      },
      {
        path: 'posture/scan-results/:accountId/:scanId',
        ...postureScanResults,
        meta: { title: 'Posture Scans Results' },
      },
      {
        path: 'posture/accounts/:nodeType',
        ...postureAccounts,
        meta: { title: 'Posture Accounts' },
      },
    ],
  },
  {
    path: '/data-component',
    children: [
      {
        path: 'vulnerability',
        children: [
          {
            path: 'sbom/:scanId',
            loader: sbomApiLoader,
          },
        ],
      },
      {
        path: 'scan-history/:scanType/:nodeType/:nodeId',
        loader: scanHistoryApiLoader,
      },
      {
        path: 'search/containers/:scanType',
        loader: searchContainersApiLoader,
      },
      {
        path: 'search/containerImages/:scanType',
        loader: searchContainerImagesApiLoader,
      },
      {
        path: 'search/hosts/:scanType',
        loader: searchHostsApiLoader,
      },
      {
        path: 'search/clusters',
        loader: searchClustersApiLoader,
      },
      {
        path: 'scan/vulnerability',
        action: scanVulnerabilityApiAction,
      },
      {
        path: 'scan/secret',
        action: scanSecretApiAction,
      },
      {
        path: 'scan/malware',
        action: scanMalwareApiAction,
      },
      {
        path: 'scan/posture',
        action: scanPostureApiAction,
      },
      {
        path: 'registries/add-connector',
        action: registryConnectorActionApi,
      },
      {
        path: 'list/controls/:checkType',
        loader: listControlsApiLoader,
        action: toggleControlApiAction,
      },
    ],
  },
];
