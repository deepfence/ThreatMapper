import { Outlet, redirect } from 'react-router-dom';

import { FiveZeroZero } from '@/components/error/500';
import { scanPostureApiAction } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { scanMalwareApiAction } from '@/components/scan-configure-forms/MalwareScanConfigureForm';
import { scanSecretApiAction } from '@/components/scan-configure-forms/SecretScanConfigureForm';
import { scanVulnerabilityApiAction } from '@/components/scan-configure-forms/VulnerabilityScanConfigureForm';
import { module as logoutAction } from '@/features/auth/data-components/logoutAction';
import { authenticatedRootLoader } from '@/features/common/data-component/authenticatedRoot/authenticatedRootLoader';
import { action as downloadScanAction } from '@/features/common/data-component/downloadScanAction';
import { getApiTokenApiLoader } from '@/features/common/data-component/getApiTokenApiLoader';
import { getUserApiLoader } from '@/features/common/data-component/getUserApiLoader';
import { registryConnectorActionApi } from '@/features/common/data-component/RegistryConnectorForm';
import { scanHistoryApiLoader } from '@/features/common/data-component/scanHistoryApiLoader';
import { searchCloudAccountsApiLoader } from '@/features/common/data-component/searchCloudAccountsApiLoader';
import { searchCloudFiltersApiLoader } from '@/features/common/data-component/searchCloudFiltersApiLoader';
import { searchClustersApiLoader } from '@/features/common/data-component/searchClustersApiLoader';
import { searchContainerImagesApiLoader } from '@/features/common/data-component/searchContainerImagesApiLoader';
import { searchContainersApiLoader } from '@/features/common/data-component/searchContainersApiLoader';
import { searchHostsApiLoader } from '@/features/common/data-component/searchHostsApiLoader';
import { RootLayout } from '@/features/common/RootLayout';
import { module as dashboard } from '@/features/dashboard/pages/Dashboard';
import { module as integrationsLayout } from '@/features/integrations/layouts/IntegrationsLayout';
import { module as downloadReport } from '@/features/integrations/pages/DownloadReport';
import { module as addIntegration } from '@/features/integrations/pages/IntegrationAdd';
import { module as integrations } from '@/features/integrations/pages/Integrations';
import { module as malwareClassesForScan } from '@/features/malwares/data-components/malwareScanClassesApiLoader';
import { module as malwareRulesForScan } from '@/features/malwares/data-components/malwareScanRulesApiLoader';
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
import { module as chooseScan } from '@/features/onboard/pages/ChooseScan';
import { module as complianceScanSummary } from '@/features/onboard/pages/ComplianceScanSummary';
import { module as configureScanForm } from '@/features/onboard/pages/ConfigureScanForm';
import { module as connector } from '@/features/onboard/pages/Connector';
import { AddConnector } from '@/features/onboard/pages/connectors/AddConnectors';
import { module as myConnectors } from '@/features/onboard/pages/connectors/MyConnectors';
import { module as malwareScanSumary } from '@/features/onboard/pages/MalwareScanSummary';
import { module as scanInProgress } from '@/features/onboard/pages/ScanInProgress';
import { module as secretScanSumary } from '@/features/onboard/pages/SecretScanSummary';
import { module as vulnerabilityScanSumary } from '@/features/onboard/pages/VulnerabilityScanSummary';
import {
  listControlsApiLoader,
  toggleControlApiAction,
} from '@/features/postures/data-component/listControlsApiLoader';
import { module as postureConnectorLayout } from '@/features/postures/layouts/PostureConnectorLayout';
import { module as postureAddAccounts } from '@/features/postures/pages/AccountAdd';
import { module as postureAccounts } from '@/features/postures/pages/Accounts';
import { module as posture } from '@/features/postures/pages/Posture';
import { module as postureCloudDetails } from '@/features/postures/pages/PostureCloudDetailModal';
import { module as postureCloudScanResults } from '@/features/postures/pages/PostureCloudScanResults';
import { module as postureDetails } from '@/features/postures/pages/PostureDetailModal';
import { module as postureScanResults } from '@/features/postures/pages/PostureScanResults';
import { module as registryConnectorLayout } from '@/features/registries/layouts/RegistryConnectorLayout';
import { module as registries } from '@/features/registries/pages/Registries';
import { module as registryAccounts } from '@/features/registries/pages/RegistryAccounts';
import { module as registryAdd } from '@/features/registries/pages/RegistryAdd';
import { module as registryImages } from '@/features/registries/pages/RegistryImages';
import { module as registryImageTags } from '@/features/registries/pages/RegistryImageTags';
import { module as secretRulesForScan } from '@/features/secrets/data-components/secretScanRulesApiLoader';
import { module as secret } from '@/features/secrets/pages/Secret';
import { module as secretDetails } from '@/features/secrets/pages/SecretDetailModal';
import { module as secretScanResults } from '@/features/secrets/pages/SecretScanResults';
import { module as secretScans } from '@/features/secrets/pages/SecretScans';
import { module as connectorInstructions } from '@/features/settings/pages/ConnectorInstructions';
import { module as diagnosticLogs } from '@/features/settings/pages/DiagnosticLogs';
import { module as emailConfiguration } from '@/features/settings/pages/EmailConfiguration';
import { module as globalSettings } from '@/features/settings/pages/GlobalSettings';
import { module as scanHistoryAndDbManagement } from '@/features/settings/pages/ScanHistoryAndDbManagement';
import { module as scheduledJobs } from '@/features/settings/pages/ScheduledJobs';
import { module as settings } from '@/features/settings/pages/Settings';
import { module as userAuditLogs } from '@/features/settings/pages/UserAuditLogs';
import { module as userManagement } from '@/features/settings/pages/UserManagement';
import { module as threatGraphDetailModal } from '@/features/threat-graph/data-components/DetailsModal';
import { module as threatGraphLoader } from '@/features/threat-graph/data-components/threatGraphLoader';
import { module as vulnerabilityTthreatGraphLoader } from '@/features/threat-graph/data-components/vulnerabilityThreatGraphLoader';
import { module as threatGraph } from '@/features/threat-graph/pages/ThreatGraph';
import { module as nodeDetailsCloudService } from '@/features/topology/data-components/node-details/CloudService';
import { module as nodeDetailsContainer } from '@/features/topology/data-components/node-details/Container';
import { module as nodeDetailsContainerImage } from '@/features/topology/data-components/node-details/ContainerImage';
import { module as nodeDetailsHost } from '@/features/topology/data-components/node-details/Host';
import { module as nodeDetailsPod } from '@/features/topology/data-components/node-details/Pod';
import { module as nodeDetailsProcess } from '@/features/topology/data-components/node-details/Process';
import { module as topologyTableContainers } from '@/features/topology/data-components/tables/ContainersTable';
import { module as topologyTableHosts } from '@/features/topology/data-components/tables/HostsTable';
import { module as topologyTableKunernetesCluster } from '@/features/topology/data-components/tables/KubernetesTable';
import { module as topologyTablePods } from '@/features/topology/data-components/tables/PodsTable';
import { module as topologyLoader } from '@/features/topology/data-components/topologyLoader';
import { module as topologyGraph } from '@/features/topology/pages/Graph';
import { module as topologyTable } from '@/features/topology/pages/Table';
import { module as topology } from '@/features/topology/pages/Topology';
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
    errorElement: <FiveZeroZero />,
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
            path: ':connectorType',
            ...connector,
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
    loader: authenticatedRootLoader,
    element: <RootLayout />,
    errorElement: <FiveZeroZero />,
    children: [
      {
        index: true,
        loader: () => redirect('/dashboard', 302),
      },
      {
        path: 'dashboard',
        ...dashboard,
        meta: { title: 'Dashboard' },
      },
      {
        path: 'topology',
        ...topology,
        children: [
          {
            index: true,
            loader: () => redirect('/topology/graph', 301),
          },
          {
            path: 'table/:viewType?',
            ...topologyTable,
            meta: { title: 'Cloud Topology' },
          },
          {
            path: 'graph/:viewType?',
            ...topologyGraph,
            meta: { title: 'Cloud Topology' },
          },
          {
            path: 'node-details',
            children: [
              {
                path: 'host/:nodeId',
                ...nodeDetailsHost,
              },
              {
                path: 'container/:nodeId',
                ...nodeDetailsContainer,
              },
              {
                path: 'process/:nodeId',
                ...nodeDetailsProcess,
              },
              {
                path: 'container_image/:nodeId',
                ...nodeDetailsContainerImage,
              },
              {
                path: 'pod/:nodeId',
                ...nodeDetailsPod,
              },
              {
                path: 'cloud-service/:nodeType',
                ...nodeDetailsCloudService,
              },
            ],
          },
        ],
      },
      {
        path: 'threatgraph',
        ...threatGraph,
        meta: { title: 'Threat Graph' },
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
      {
        path: 'integrations/notifications/add',
        ...integrationsLayout,
        meta: { title: 'Add Notifications' },
        children: [
          {
            path: ':integrationType',
            ...addIntegration,
            meta: { title: 'Add Integration' },
          },
        ],
      },
      {
        path: 'integrations/seim/add',
        ...integrationsLayout,
        meta: { title: 'Add Notifications' },
        children: [
          {
            path: ':integrationType',
            ...addIntegration,
            meta: { title: 'Add Integration' },
          },
        ],
      },
      {
        path: 'integrations/ticketing/add',
        ...integrationsLayout,
        meta: { title: 'Add Notifications' },
        children: [
          {
            path: ':integrationType',
            ...addIntegration,
            meta: { title: 'Add Integration' },
          },
        ],
      },
      {
        path: 'integrations/archival/add',
        ...integrationsLayout,
        meta: { title: 'Add Notifications' },
        children: [
          {
            path: ':integrationType',
            ...addIntegration,
            meta: { title: 'Add Integration' },
          },
        ],
      },
      // report
      {
        path: 'integrations/download/report',
        ...downloadReport,
        meta: { title: 'Download Report' },
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
        id: 'vulnerability-scan-results',
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
        id: 'secret-scan-results',
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
            path: ':account',
            ...postureAddAccounts,
            meta: { title: 'Posture Add Account' },
          },
        ],
      },
      {
        path: 'posture/scan-results/:nodeType/:scanId',
        ...postureScanResults,
        meta: { title: 'Posture Scans Results' },
        id: 'posture-scan-results',
        children: [
          {
            path: ':complianceId',
            ...postureDetails,
            meta: { title: 'Posture Details' },
          },
        ],
      },
      {
        path: 'posture/cloud/scan-results/:nodeType/:scanId',
        ...postureCloudScanResults,
        meta: { title: 'Posture Scans Results' },
        id: 'posture-cloud-scan-results',
        children: [
          {
            path: ':complianceId',
            ...postureCloudDetails,
            meta: { title: 'Posture Details' },
          },
        ],
      },
      {
        path: 'posture/accounts/:nodeType',
        ...postureAccounts,
        meta: { title: 'Posture Accounts' },
      },
      {
        path: 'settings',
        ...settings,
        meta: { title: 'Settings' },
        children: [
          {
            index: true,
            loader: () => redirect('/settings/user-management', 302),
          },
          {
            path: 'diagnostic-logs',
            ...diagnosticLogs,
            meta: { title: 'Diagnostic Logs' },
          },
          {
            path: 'user-management',
            ...userManagement,
            meta: { title: 'User Management' },
          },
          {
            path: 'scan-history-and-db-management',
            ...scanHistoryAndDbManagement,
            meta: { title: 'Scan History & Database Management' },
          },
          {
            path: 'scheduled-jobs',
            ...scheduledJobs,
            meta: { title: 'Scheduled Jobs' },
          },
          {
            path: 'user-audit-logs',
            ...userAuditLogs,
            meta: { title: 'User Audit Logs' },
          },
          {
            path: 'email-configuration',
            ...emailConfiguration,
            meta: { title: 'Email Configuration' },
          },
          {
            path: 'global-settings',
            ...globalSettings,
            meta: { title: 'Global Settings' },
          },
          {
            path: 'connection-instructions',
            ...connectorInstructions,
            meta: { title: 'Connector Instructions' },
          },
          {
            path: 'connector-instructions/:connectorType',
            ...connectorInstructions,
          },
        ],
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
        shouldRevalidate: ({ formAction }) => {
          if (formAction) return false;
          return true;
        },
      },
      {
        path: 'search/containerImages/:scanType',
        loader: searchContainerImagesApiLoader,
        shouldRevalidate: ({ formAction }) => {
          if (formAction) return false;
          return true;
        },
      },
      {
        path: 'search/hosts/:scanType',
        loader: searchHostsApiLoader,
        shouldRevalidate: ({ formAction }) => {
          if (formAction) return false;
          return true;
        },
      },
      {
        path: 'search/clusters',
        loader: searchClustersApiLoader,
        shouldRevalidate: ({ formAction }) => {
          if (formAction) return false;
          return true;
        },
      },
      {
        path: 'search/cloud-accounts/:nodeType',
        loader: searchCloudAccountsApiLoader,
        shouldRevalidate: ({ formAction }) => {
          if (formAction) return false;
          return true;
        },
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
        path: 'list/controls/:nodeType/:checkType',
        loader: listControlsApiLoader,
        action: toggleControlApiAction,
      },
      {
        path: 'search/cloud/filters/:scanId',
        loader: searchCloudFiltersApiLoader,
      },
      {
        path: 'threat-graph/details-modal',
        ...threatGraphDetailModal,
      },
      {
        path: 'topology',
        ...topologyLoader,
      },
      {
        path: 'topology/table/hosts',
        ...topologyTableHosts,
      },
      {
        path: 'topology/table/kubernetesCluster',
        ...topologyTableKunernetesCluster,
      },
      {
        path: 'topology/table/containers',
        ...topologyTableContainers,
      },
      {
        path: 'topology/table/pods',
        ...topologyTablePods,
      },
      {
        path: 'threat-graph',
        ...threatGraphLoader,
      },
      {
        path: 'threat-graph-vulnerability',
        ...vulnerabilityTthreatGraphLoader,
      },
      {
        path: 'auth/logout',
        ...logoutAction,
      },
      {
        path: 'auth/apiToken',
        loader: getApiTokenApiLoader,
      },
      {
        path: 'auth/user',
        loader: getUserApiLoader,
      },
      {
        path: 'scan/download',
        action: downloadScanAction,
      },
      {
        path: 'secret/rules/scan/:scanId',
        ...secretRulesForScan,
      },
      {
        path: 'malware/rules/scan/:scanId',
        ...malwareRulesForScan,
      },
      {
        path: 'malware/classes/scan/:scanId',
        ...malwareClassesForScan,
      },
    ],
  },
];
