// TODO: see if this is released https://github.com/OpenAPITools/openapi-generator/pull/13825
// otherwilse there is a bug which needs some manual fixes everytime we regenerate

import {
  AuthenticationApi,
  CloudNodesApi,
  CloudScannerApi,
  ComplianceApi,
  Configuration,
  MalwareScanApi,
  RegistryApi,
  ScanResultsApi,
  SearchApi,
  SecretScanApi,
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
});

export function getAuthenticationApiClient() {
  const authenticationApi = new AuthenticationApi(configuration);
  return {
    login: authenticationApi.login.bind(authenticationApi),
    refreshAccessToken: authenticationApi.authTokenRefresh.bind(authenticationApi),
  };
}

export function getUserApiClient() {
  const userApi = new UserApi(configuration);
  return {
    registerUser: userApi.registerUser.bind(userApi),
  };
}

export function getTopologyApiClient() {
  const topologyApi = new TopologyApi(configuration);
  return {
    getHostsTopologyGraph: topologyApi.getHostsTopologyGraph.bind(topologyApi),
    getKubernetesTopologyGraph: topologyApi.getKubernetesTopologyGraph.bind(topologyApi),
  };
}

export function getCloudNodesApiClient() {
  const cloudNodesApi = new CloudNodesApi(configuration);
  return {
    listCloudNodeAccount: cloudNodesApi.listCloudNodeAccount.bind(cloudNodesApi),
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
  };
}

export function getSecretApiClient() {
  const secretApi = new SecretScanApi(configuration);
  return {
    startSecretScan: secretApi.startSecretScan.bind(secretApi),
    resultSecretScan: secretApi.resultsSecretScan.bind(secretApi),
    statusSecretScan: secretApi.statusSecretScan.bind(secretApi),
  };
}

export function getComplianceApiClient() {
  const complianceApi = new ComplianceApi(configuration);
  return {
    startComplianceScan: complianceApi.startComplianceScan.bind(complianceApi),
    statusComplianceScan: complianceApi.statusComplianceScan.bind(complianceApi),
    resultComplianceScan: complianceApi.resultsComplianceScan.bind(complianceApi),
  };
}

export function getCloudComplianceApiClient() {
  const cloudScannerApi = new CloudScannerApi(configuration);
  return {
    statusCloudComplianceScan:
      cloudScannerApi.statusCloudComplianceScan.bind(cloudScannerApi),
    resultCloudComplianceScan:
      cloudScannerApi.resultsCloudComplianceScan.bind(cloudScannerApi),
  };
}

export function getRegistriesApiClient() {
  const registriesApi = new RegistryApi(configuration);
  return {
    listRegistries: registriesApi.listRegistry.bind(registriesApi),
    addRegistry: registriesApi.addRegistry.bind(registriesApi),
  };
}

export function getMalwareScanApiClient() {
  const malwareApi = new MalwareScanApi(configuration);
  return {
    startMalwareScan: malwareApi.startMalwareScan.bind(malwareApi),
    resultMalwareScan: malwareApi.resultsMalwareScan.bind(malwareApi),
    statusMalwareScan: malwareApi.statusMalwareScan.bind(malwareApi),
  };
}

export function getSearchApiClient() {
  const searchApi = new SearchApi(configuration);
  return {
    searchVulnerabilityScan: searchApi.searchVulnerabilityScans.bind(searchApi),
    searchContainerImages: searchApi.searchContainerImages.bind(searchApi),
    searchContainers: searchApi.searchContainers.bind(searchApi),
    searchHosts: searchApi.searchHosts.bind(searchApi),
    searchVulnerabilities: searchApi.searchVulnerabilities.bind(searchApi),
    searchVulnerabilitiesCount: searchApi.countVulnerabilities.bind(searchApi),
    searchVulnerabilityScanCount: searchApi.countVulnerabilityScans.bind(searchApi),
    searchVulnerabilityCount: searchApi.countVulnerabilities.bind(searchApi),
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
