// TODO: see if this is released https://github.com/OpenAPITools/openapi-generator/pull/13825
// otherwilse there is a bug which needs some manual fixes everytime we regenerate

import {
  AuthenticationApi,
  CloudNodesApi,
  CloudScannerApi,
  CommonApi,
  CompletionApi,
  ComplianceApi,
  Configuration,
  ControlsApi,
  DiagnosisApi,
  DiffAddApi,
  GenerativeAIApi,
  IntegrationApi,
  LookupApi,
  MalwareScanApi,
  RegistryApi,
  ReportsApi,
  RulesApi,
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
    registerInvitedUser: userApi.registerInvitedUser.bind(userApi),
    resetPasswordRequest: userApi.resetPasswordRequest.bind(userApi),
    verifyResetPasswordRequest: userApi.verifyResetPasswordRequest.bind(userApi),
    resetApiTokens: userApi.resetApiTokens.bind(userApi),
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
    stopVulnerabilityScan: vulnerabilityApi.stopVulnerabilityScan.bind(vulnerabilityApi),
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
    stopSecretScan: secretApi.stopSecretScan.bind(secretApi),
    resultSecretScan: secretApi.resultsSecretScan.bind(secretApi),
    resultCountSecretScan: secretApi.countResultsSecretScan.bind(secretApi),
    statusSecretScan: secretApi.statusSecretScan.bind(secretApi),
    listSecretScans: secretApi.listSecretScan.bind(secretApi),
    getSecretsCountByRulename: secretApi.groupResultsSecrets.bind(secretApi),
    getSecretRulesForScan: secretApi.resultsRulesSecretScan.bind(secretApi),
  };
}

export function getComplianceApiClient() {
  const complianceApi = new ComplianceApi(configuration);
  return {
    startComplianceScan: complianceApi.startComplianceScan.bind(complianceApi),
    stopComplianceScan: complianceApi.stopComplianceScan.bind(complianceApi),
    statusComplianceScan: complianceApi.statusComplianceScan.bind(complianceApi),
    resultComplianceScan: complianceApi.resultsComplianceScan.bind(complianceApi),
    resultCountComplianceScan:
      complianceApi.countResultsComplianceScan.bind(complianceApi),
    listComplianceScan: complianceApi.listComplianceScan.bind(complianceApi),
    scanResultCloudComplianceCountsByControls:
      complianceApi.groupResultsCloudCompliance.bind(complianceApi),
    scanResultComplianceCountsByControls:
      complianceApi.groupResultsCompliance.bind(complianceApi),
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
    syncRegistryImages: registriesApi.syncRegistry.bind(registriesApi),
    deleteRegistryBulk: registriesApi.deleteRegistryBulk.bind(registriesApi),
  };
}

export function getMalwareApiClient() {
  const malwareApi = new MalwareScanApi(configuration);
  return {
    startMalwareScan: malwareApi.startMalwareScan.bind(malwareApi),
    stopMalwareScan: malwareApi.stopMalwareScan.bind(malwareApi),
    resultMalwareScan: malwareApi.resultsMalwareScan.bind(malwareApi),
    resultCountMalwareScan: malwareApi.countResultsMalwareScan.bind(malwareApi),
    statusMalwareScan: malwareApi.statusMalwareScan.bind(malwareApi),
    listMalwareScans: malwareApi.listMalwareScan.bind(malwareApi),
    getMalwareCountByRulename: malwareApi.groupResultsMalwares.bind(malwareApi),
    getMalwareCountByClass: malwareApi.groupResultsMalwaresClass.bind(malwareApi),
    getMalwareRulesForScan: malwareApi.resultsRulesMalwareScan.bind(malwareApi),
    getMalwareClassesForScan: malwareApi.resultsClassMalwareScan.bind(malwareApi),
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
    countKubernetesClusters: searchApi.countKubernetesClusters.bind(searchApi),
    countPods: searchApi.countPods.bind(searchApi),
    searchPods: searchApi.searchPods.bind(searchApi),
    countContainers: searchApi.countContainers.bind(searchApi),
    searchVulnerabilities: searchApi.searchVulnerabilities.bind(searchApi),
    searchVulnerabilitiesCount: searchApi.countVulnerabilities.bind(searchApi),
    searchVulnerabilityScanCount: searchApi.countVulnerabilityScans.bind(searchApi),
    searchCloudResources: searchApi.searchCloudResources.bind(searchApi),
    searchCloudResourcesCount: searchApi.countCloudResources.bind(searchApi),
    searchRegistryAccounts: searchApi.searchRegistryAccounts.bind(searchApi),

    searchSecretsScan: searchApi.searchSecretsScans.bind(searchApi),
    searchSecrets: searchApi.searchSecrets.bind(searchApi),
    searchSecretsCount: searchApi.countSecrets.bind(searchApi),
    searchSecretScanCount: searchApi.countSecretsScans.bind(searchApi),
    searchSecretRules: searchApi.searchSecretRules.bind(searchApi),
    searchSecretRulesCount: searchApi.countSecretRules.bind(searchApi),

    searchMalwaresScan: searchApi.searchMalwareScans.bind(searchApi),
    searchMalwares: searchApi.searchMalwares.bind(searchApi),
    searchMalwaresCount: searchApi.countMalwares.bind(searchApi),
    searchMalwareScanCount: searchApi.countMalwareScans.bind(searchApi),
    searchMalwareRules: searchApi.searchMalwareRules.bind(searchApi),
    searchMalwareRulesCount: searchApi.countMalwareRules.bind(searchApi),

    searchCompliances: searchApi.searchCompliances.bind(searchApi),
    searchCloudCompliances: searchApi.searchCloudCompliances.bind(searchApi),

    getCloudComplianceFilters: searchApi.getCloudComplianceFilters.bind(searchApi),

    getNodeCounts: searchApi.countNodes.bind(searchApi),

    searchCloudAccounts: searchApi.searchCloudAccounts.bind(searchApi),
    searchCloudAccountsCount: searchApi.countCloudAccounts.bind(searchApi),
  };
}

export function getScanResultsApiClient() {
  const scanResultsApi = new ScanResultsApi(configuration);

  return {
    deleteScanResult: scanResultsApi.deleteScanResult.bind(scanResultsApi),
    downloadScanResultsForScanID: scanResultsApi.downloadScanResults.bind(scanResultsApi),
    bulkDeleteScans: scanResultsApi.bulkDeleteScans.bind(scanResultsApi),
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
    refreshCloudNodeAccount: cloudNodesApi.refreshCloudNodeAccount.bind(cloudNodesApi),
    deleteCloudNodeAccount: cloudNodesApi.deleteCloudNodeAccount.bind(cloudNodesApi),
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
    lookupCloudPostures: lookupApi.getCloudCompliances.bind(lookupApi),
    lookupPostures: lookupApi.getCompliances.bind(lookupApi),
    lookupVulnerabilities: lookupApi.getVulnerabilities.bind(lookupApi),
    lookupSecrets: lookupApi.getSecrets.bind(lookupApi),
    lookupMalwares: lookupApi.getMalwares.bind(lookupApi),
    lookupCompliances: lookupApi.getCompliances.bind(lookupApi),
    lookupCloudCompliances: lookupApi.getCloudCompliances.bind(lookupApi),
    lookupRegistryAccounts: lookupApi.getRegistryAccount.bind(lookupApi),
    lookupComplianceControls: lookupApi.getComplianceControls.bind(lookupApi),
    lookupVulnerabilityRules: lookupApi.getVulnerabilityRules.bind(lookupApi),
    lookupSecretRules: lookupApi.getSecretRules.bind(lookupApi),
    lookupMalwareRules: lookupApi.getMalwareRules.bind(lookupApi),
  };
}

export function getThreatGraphApiClient() {
  const threatGraphApi = new ThreatApi(configuration);

  return {
    getThreatGraph: threatGraphApi.getThreatGraph.bind(threatGraphApi),
    getIndividualThreatGraph:
      threatGraphApi.getIndividualThreatGraph.bind(threatGraphApi),
  };
}

export function getDiagnosisApiClient() {
  const diagnosisApi = new DiagnosisApi(configuration);

  return {
    generateAgentDiagnosticLogs:
      diagnosisApi.generateAgentDiagnosticLogs.bind(diagnosisApi),
    generateCloudScannerDiagnosticLogs:
      diagnosisApi.generateCloudScannerDiagnosticLogs.bind(diagnosisApi),
    generateConsoleDiagnosticLogs:
      diagnosisApi.generateConsoleDiagnosticLogs.bind(diagnosisApi),
    getDiagnosticLogs: diagnosisApi.getDiagnosticLogs.bind(diagnosisApi),
  };
}

export function getIntegrationApiClient() {
  const integrationApi = new IntegrationApi(configuration);

  return {
    addIntegration: integrationApi.addIntegration.bind(integrationApi),
    updateIntegration: integrationApi.updateIntegration.bind(integrationApi),
    listIntegration: integrationApi.listIntegration.bind(integrationApi),
    deleteIntegration: integrationApi.deleteIntegration.bind(integrationApi),
    bulkDeleteIntegration: integrationApi.deleteIntegrations.bind(integrationApi),
  };
}

export function getGenerativeAIIntegraitonClient() {
  const generativeAiApi = new GenerativeAIApi(configuration);

  return {
    generativeAiIntegrationCloudPostureQuery:
      generativeAiApi.generativeAiIntegrationCloudPostureQueryRaw.bind(generativeAiApi),
    generativeAiIntegrationVulnerabilityQuery:
      generativeAiApi.generativeAiIntegrationVulnerabilityQueryRaw.bind(generativeAiApi),
    generativeAiIntegrationLinuxPostureQuery:
      generativeAiApi.generativeAiIntegrationLinuxPostureQueryRaw.bind(generativeAiApi),
    generativeAiIntegrationKubernetesPostureQuery:
      generativeAiApi.generativeAiIntegrationKubernetesPostureQueryRaw.bind(
        generativeAiApi,
      ),
    generativeAiIntegrationSecretQuery:
      generativeAiApi.generativeAiIntegrationSecretQueryRaw.bind(generativeAiApi),
    generativeAiIntegrationMalwareQuery:
      generativeAiApi.generativeAiIntegrationMalwareQueryRaw.bind(generativeAiApi),
    listGenerativeAiIntegration:
      generativeAiApi.listGenerativeAiIntegration.bind(generativeAiApi),
    addGenerativeAiIntegrationOpenAI:
      generativeAiApi.addGenerativeAiIntegrationOpenAI.bind(generativeAiApi),
    addGenerativeAiIntegrationBedrock:
      generativeAiApi.addGenerativeAiIntegrationBedrock.bind(generativeAiApi),
    autoAddGenerativeAiIntegration:
      generativeAiApi.autoAddGenerativeAiIntegration.bind(generativeAiApi),
    deleteGenerativeAiIntegration:
      generativeAiApi.deleteGenerativeAiIntegration.bind(generativeAiApi),
    setDefaultGenerativeAiIntegration:
      generativeAiApi.setDefaultGenerativeAiIntegration.bind(generativeAiApi),
  };
}

export function getReportsApiClient() {
  const reportsApi = new ReportsApi(configuration);

  return {
    listReports: reportsApi.listReports.bind(reportsApi),
    generateReport: reportsApi.generateReport.bind(reportsApi),
    deleteReport: reportsApi.deleteReport.bind(reportsApi),
    getReport: reportsApi.getReport.bind(reportsApi),
    bulkDeleteReports: reportsApi.bulkDeleteReports.bind(reportsApi),
  };
}

export function getSettingsApiClient() {
  const settingsApi = new SettingsApi(configuration);

  return {
    getSettings: settingsApi.getSettings.bind(settingsApi),
    updateSettings: settingsApi.updateSetting.bind(settingsApi),
    getUserActivityLogs: settingsApi.getUserAuditLogs.bind(settingsApi),
    getUserActivityLogCount: settingsApi.getUserAuditLogsCount.bind(settingsApi),
    getEmailConfiguration: settingsApi.getEmailConfiguration.bind(settingsApi),
    addEmailConfiguration: settingsApi.addEmailConfiguration.bind(settingsApi),
    deleteEmailConfiguration: settingsApi.deleteEmailConfiguration.bind(settingsApi),
    uploadVulnerabilityDatabase:
      settingsApi.uploadVulnerabilityDatabase.bind(settingsApi),
    uploadSecretsRules: settingsApi.uploadSecretsRules.bind(settingsApi),
    uploadMalwareRules: settingsApi.uploadMalwareRules.bind(settingsApi),
    uploadPostureControls: settingsApi.uploadPostureControls.bind(settingsApi),
    getScheduledTasks: settingsApi.getScheduledTasks.bind(settingsApi),
    updateScheduledTask: settingsApi.updateScheduledTask.bind(settingsApi),
    deleteCustomScheduledTask: settingsApi.deleteCustomScheduledTask.bind(settingsApi),
    addScheduledTask: settingsApi.addScheduledTask.bind(settingsApi),
    getAgentVersions: settingsApi.getAgentVersions.bind(settingsApi),
    generateThreatMapperLicense: settingsApi.generateLicense.bind(settingsApi),
    registerThreatMapperLicense: settingsApi.registerLicense.bind(settingsApi),
    getThreatMapperLicense: settingsApi.getLicense.bind(settingsApi),
    deleteThreatMapperLicense: settingsApi.deleteLicense.bind(settingsApi),
    testUnconfiguredEmail: settingsApi.testUnconfiguredEmail.bind(settingsApi),
  };
}

export function getCommonApiClient() {
  const commonApi = new CommonApi(configuration);
  return {
    getEula: commonApi.eula.bind(commonApi),
    getScanReportFields: commonApi.getScanReportFields.bind(commonApi),
  };
}

export function getScanCompareApiClient() {
  const scanCompareApi = new DiffAddApi(configuration);
  return {
    diffVulnerability: scanCompareApi.diffAddVulnerability.bind(scanCompareApi),
    diffAddSecret: scanCompareApi.diffAddSecret.bind(scanCompareApi),
    diffAddMalware: scanCompareApi.diffAddMalware.bind(scanCompareApi),
    diffAddCompliance: scanCompareApi.diffAddCompliance.bind(scanCompareApi),
    diffAddCloudCompliance: scanCompareApi.diffAddCloudCompliance.bind(scanCompareApi),
  };
}

export function getScanResultCompletionApiClient() {
  const scanCompleteionApi = new CompletionApi(configuration);
  return {
    completeVulnerabilityInfo:
      scanCompleteionApi.completeVulnerabilityInfo.bind(scanCompleteionApi),
    completeHostInfo: scanCompleteionApi.completeHostInfo.bind(scanCompleteionApi),
    completeComplianceInfo:
      scanCompleteionApi.completeComplianceInfo.bind(scanCompleteionApi),
    completeCloudCompliance:
      scanCompleteionApi.completeCloudCompliance.bind(scanCompleteionApi),
    completePodInfo: scanCompleteionApi.completePodInfo.bind(scanCompleteionApi),
    completeContainerInfo:
      scanCompleteionApi.completeContainerInfo.bind(scanCompleteionApi),
    completeCloudResources:
      scanCompleteionApi.completeCloudResources.bind(scanCompleteionApi),
    completeCloudAccount:
      scanCompleteionApi.completeCloudAccount.bind(scanCompleteionApi),
    completeKubernetesClusterInfo:
      scanCompleteionApi.completeKubernetesClusterInfo.bind(scanCompleteionApi),
  };
}

export function getRulesApiClient() {
  const rulesApi = new RulesApi(configuration);
  return {
    maskRules: rulesApi.maskRules.bind(rulesApi),
    unmaskRules: rulesApi.unmaskRules.bind(rulesApi),
  };
}
