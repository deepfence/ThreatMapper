// TODO: see if this is released https://github.com/OpenAPITools/openapi-generator/pull/13825
// otherwilse there is a bug which needs some manual fixes everytime we regenerate

import {
  AuthenticationApi,
  CloudNodesApi,
  CloudScannerApi,
  ComplianceApi,
  Configuration,
  ControlsApi,
  DiagnosisApi,
  IntegrationApi,
  LookupApi,
  MalwareScanApi,
  RegistryApi,
  ScanResultsApi,
  SearchApi,
  SecretScanApi,
  SettingsApi,
  ThreatApi,
  TopologyApi,
  UserApi,
  VulnerabilityApi,
} from '@/api/generated';
import storage from '@/utils/storage';

import { ReportsApi } from './generated/apis/ReportsApi';

const configuration = new Configuration({
  basePath: `${window.location.protocol}//${window.location.host}`,
  accessToken: () => {
    return storage.getAuth()?.accessToken ?? '';
  },
  headers: {
    'accept-encoding': 'gzip, deflate, br',
  },
});

export function getAuthenticationApiClient() {
  const authenticationApi = new AuthenticationApi(configuration);
  return {
    login: authenticationApi.login.bind(authenticationApi),
    logout: authenticationApi.logout.bind(authenticationApi),
    refreshAccessToken: authenticationApi.authTokenRefresh.bind(authenticationApi),
  };
}

export function getUserApiClient() {
  const userApi = new UserApi(configuration);
  return {
    registerUser: userApi.registerUser.bind(userApi),
    getUsers: userApi.getUsers.bind(userApi),
    getUser: userApi.getUser.bind(userApi),
    getCurrentUser: userApi.getCurrentUser.bind(userApi),
    getApiTokens: userApi.getApiTokens.bind(userApi),
    updateUser: userApi.updateUser.bind(userApi),
    deleteUser: userApi.deleteUser.bind(userApi),
    updatePassword: userApi.updatePassword.bind(userApi),
    inviteUser: userApi.inviteUser.bind(userApi),
  };
}

export function getTopologyApiClient() {
  const topologyApi = new TopologyApi(configuration);
  return {
    getCloudTopologyGraph: topologyApi.getTopologyGraph.bind(topologyApi),
    getHostsTopologyGraph: topologyApi.getHostsTopologyGraph.bind(topologyApi),
    getKubernetesTopologyGraph: topologyApi.getKubernetesTopologyGraph.bind(topologyApi),
    getContainersTopologyGraph: topologyApi.getContainersTopologyGraph.bind(topologyApi),
    getPodsTopologyGraph: topologyApi.getPodsTopologyGraph.bind(topologyApi),
  };
}

export function getVulnerabilityApiClient() {
  const vulnerabilityApi = new VulnerabilityApi(configuration);

  return {
    startVulnerabilityScan:
      vulnerabilityApi.startVulnerabilityScan.bind(vulnerabilityApi),
    resultVulnerabilityScan:
      vulnerabilityApi.resultsVulnerabilityScans.bind(vulnerabilityApi),
    resultCountVulnerabilityScan:
      vulnerabilityApi.countResultsVulnerabilityScans.bind(vulnerabilityApi),
    statusVulnerabilityScan:
      vulnerabilityApi.statusVulnerabilityScan.bind(vulnerabilityApi),
    listVulnerabilityScans:
      vulnerabilityApi.listVulnerabilityScans.bind(vulnerabilityApi),
    getSbom: vulnerabilityApi.getSBOM.bind(vulnerabilityApi),
  };
}

export function getSecretApiClient() {
  const secretApi = new SecretScanApi(configuration);
  return {
    startSecretScan: secretApi.startSecretScan.bind(secretApi),
    resultSecretScan: secretApi.resultsSecretScan.bind(secretApi),
    resultCountSecretScan: secretApi.countResultsSecretScan.bind(secretApi),
    statusSecretScan: secretApi.statusSecretScan.bind(secretApi),
    listSecretScans: secretApi.listSecretScan.bind(secretApi),
  };
}

export function getComplianceApiClient() {
  const complianceApi = new ComplianceApi(configuration);
  return {
    startComplianceScan: complianceApi.startComplianceScan.bind(complianceApi),
    statusComplianceScan: complianceApi.statusComplianceScan.bind(complianceApi),
    resultComplianceScan: complianceApi.resultsComplianceScan.bind(complianceApi),
    resultCountComplianceScan:
      complianceApi.countResultsComplianceScan.bind(complianceApi),
    listComplianceScan: complianceApi.listComplianceScan.bind(complianceApi),
  };
}

export function getCloudComplianceApiClient() {
  const cloudScannerApi = new CloudScannerApi(configuration);
  return {
    statusCloudComplianceScan:
      cloudScannerApi.statusCloudComplianceScan.bind(cloudScannerApi),
    resultCloudComplianceScan:
      cloudScannerApi.resultsCloudComplianceScan.bind(cloudScannerApi),
    resultCountCloudComplianceScan:
      cloudScannerApi.countResultsCloudComplianceScan.bind(cloudScannerApi),
    listCloudComplianceScan:
      cloudScannerApi.listCloudComplianceScan.bind(cloudScannerApi),
  };
}

export function getRegistriesApiClient() {
  const registriesApi = new RegistryApi(configuration);
  return {
    getRegistriesSummary: registriesApi.getSummaryAll.bind(registriesApi),
    getRegistrySummary: registriesApi.getRegistrySummary.bind(registriesApi),
    getRegistrySummaryByType: registriesApi.getSummaryByType.bind(registriesApi),
    listRegistries: registriesApi.listRegistry.bind(registriesApi),
    addRegistry: registriesApi.addRegistry.bind(registriesApi),
    addRegistryGCR: registriesApi.addRegistryGCR.bind(registriesApi),
    deleteRegistry: registriesApi.deleteRegistry.bind(registriesApi),
    listImages: registriesApi.listImages.bind(registriesApi),
    countImages: registriesApi.countImages.bind(registriesApi),
    countImageStubs: registriesApi.countImageStubs.bind(registriesApi),
    listImageStubs: registriesApi.listImageStubs.bind(registriesApi),
  };
}

export function getMalwareApiClient() {
  const malwareApi = new MalwareScanApi(configuration);
  return {
    startMalwareScan: malwareApi.startMalwareScan.bind(malwareApi),
    resultMalwareScan: malwareApi.resultsMalwareScan.bind(malwareApi),
    resultCountMalwareScan: malwareApi.countResultsMalwareScan.bind(malwareApi),
    statusMalwareScan: malwareApi.statusMalwareScan.bind(malwareApi),
    listMalwareScans: malwareApi.listMalwareScan.bind(malwareApi),
  };
}

export function getSearchApiClient() {
  const searchApi = new SearchApi(configuration);
  return {
    searchVulnerabilityScan: searchApi.searchVulnerabilityScans.bind(searchApi),
    searchContainerImages: searchApi.searchContainerImages.bind(searchApi),
    searchContainerImagesCount: searchApi.countContainerImages.bind(searchApi),
    searchContainers: searchApi.searchContainers.bind(searchApi),
    searchContainersCount: searchApi.countContainers.bind(searchApi),
    searchHosts: searchApi.searchHosts.bind(searchApi),
    searchHostsCount: searchApi.countHosts.bind(searchApi),
    searchKubernetesClusters: searchApi.searchKubernetesClusters.bind(searchApi),
    searchVulnerabilities: searchApi.searchVulnerabilities.bind(searchApi),
    searchVulnerabilitiesCount: searchApi.countVulnerabilities.bind(searchApi),
    searchVulnerabilityScanCount: searchApi.countVulnerabilityScans.bind(searchApi),

    searchSecretsScan: searchApi.searchSecretsScans.bind(searchApi),
    searchSecrets: searchApi.searchSecrets.bind(searchApi),
    searchSecretsCount: searchApi.countSecrets.bind(searchApi),
    searchSecretScanCount: searchApi.countSecretsScans.bind(searchApi),

    searchMalwaresScan: searchApi.searchMalwareScans.bind(searchApi),
    searchMalwares: searchApi.searchMalwares.bind(searchApi),
    searchMalwaresCount: searchApi.countMalwares.bind(searchApi),
    searchMalwareScanCount: searchApi.countMalwareScans.bind(searchApi),

    searchCompliances: searchApi.searchCompliances.bind(searchApi),
    searchCloudCompliances: searchApi.searchCloudCompliances.bind(searchApi),

    getCloudComplianceFilters: searchApi.getCloudComplianceFilters.bind(searchApi),

    getNodeCounts: searchApi.countNodes.bind(searchApi),
  };
}

export function getScanResultsApiClient() {
  const scanResultsApi = new ScanResultsApi(configuration);

  return {
    deleteScanResult: scanResultsApi.deleteScanResult.bind(scanResultsApi),
    downloadScanResultsForScanID: scanResultsApi.downloadScanResults.bind(scanResultsApi),
    deleteScanResultsForScanID:
      scanResultsApi.deleteScanResultsForScanID.bind(scanResultsApi),
    notifyScanResult: scanResultsApi.notifyScanResult.bind(scanResultsApi),
    maskScanResult: scanResultsApi.maskScanResult.bind(scanResultsApi),
    unmaskScanResult: scanResultsApi.unmaskScanResult.bind(scanResultsApi),
    getAllNodesInScanResults:
      scanResultsApi.getAllNodesInScanResults.bind(scanResultsApi),
  };
}

export function getControlsApiClient() {
  const controlsApi = new ControlsApi(configuration);

  return {
    listControls: controlsApi.getCloudNodeControls.bind(controlsApi),
    enableControl: controlsApi.enableCloudNodeControls.bind(controlsApi),
    disableControl: controlsApi.disableCloudNodeControls.bind(controlsApi),
  };
}

export function getCloudNodesApiClient() {
  const cloudNodesApi = new CloudNodesApi(configuration);

  return {
    listCloudNodeAccount: cloudNodesApi.listCloudNodeAccount.bind(cloudNodesApi),
    listCloudProviders: cloudNodesApi.listCloudProviders.bind(cloudNodesApi),
  };
}

export function getLookupApiClient() {
  const lookupApi = new LookupApi(configuration);
  return {
    lookupHost: lookupApi.getHosts.bind(lookupApi),
    lookupContainer: lookupApi.getContainers.bind(lookupApi),
    lookupImage: lookupApi.getContainerImages.bind(lookupApi),
    lookupPod: lookupApi.getPods.bind(lookupApi),
    lookupProcess: lookupApi.getProcesses.bind(lookupApi),
    lookupKubernetesClusters: lookupApi.getKubernetesClusters.bind(lookupApi),
    lookupCloudResources: lookupApi.getCloudResources.bind(lookupApi),
  };
}

export function getThreatGraphApiClient() {
  const threatGraphApi = new ThreatApi(configuration);

  return {
    getThreatGraph: threatGraphApi.getThreatGraph.bind(threatGraphApi),
  };
}

export function getDiagnosisApiClient() {
  const diagnosisApi = new DiagnosisApi(configuration);

  return {
    generateAgentDiagnosticLogs:
      diagnosisApi.generateAgentDiagnosticLogs.bind(diagnosisApi),
    generateConsoleDiagnosticLogs:
      diagnosisApi.generateConsoleDiagnosticLogs.bind(diagnosisApi),
    getDiagnosticLogs: diagnosisApi.getDiagnosticLogs.bind(diagnosisApi),
  };
}

export function getIntegrationApiClient() {
  const integrationApi = new IntegrationApi(configuration);

  return {
    addIntegration: integrationApi.addIntegration.bind(integrationApi),
    listIntegration: integrationApi.listIntegration.bind(integrationApi),
    deleteIntegration: integrationApi.deleteIntegration.bind(integrationApi),
  };
}

export function getReportsApiClient() {
  const reportsApi = new ReportsApi(configuration);

  return {
    listReports: reportsApi.listReports.bind(reportsApi),
    generateReport: reportsApi.generateReport.bind(reportsApi),
    deleteReport: reportsApi.deleteReport.bind(reportsApi),
  };
}

export function getSettingsApiClient() {
  const settingsApi = new SettingsApi(configuration);

  return {
    getSettings: settingsApi.getSettings.bind(settingsApi),
    updateSettings: settingsApi.updateSetting.bind(settingsApi),
    getUserActivityLogs: settingsApi.getUserActivityLogs.bind(settingsApi),
    getEmailConfiguration: settingsApi.getEmailConfiguration.bind(settingsApi),
    addEmailConfiguration: settingsApi.addEmailConfiguration.bind(settingsApi),
    deleteEmailConfiguration: settingsApi.deleteEmailConfiguration.bind(settingsApi),
  };
}
