// TODO: see if this is released https://github.com/OpenAPITools/openapi-generator/pull/13825
// otherwilse there is a bug which needs some manual fixes everytime we regenerate

import {
  AuthenticationApi,
  ComplianceApi,
  Configuration,
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
  };
}

export function getUserApiClient() {
  const userApi = new UserApi(configuration);
  return {
    registerUser: userApi.registerUser.bind(userApi),
  };
}

export function vulnerabilityScanApiClient() {
  const vulnerabilityApi = new VulnerabilityApi(configuration);
  return {
    startVulnerabilityScan:
      vulnerabilityApi.startVulnerabilityScan.bind(vulnerabilityApi),
    statusVulnerabilityScan:
      vulnerabilityApi.statusVulnerabilityScan.bind(vulnerabilityApi),
    resultVulnerabilityScan:
      vulnerabilityApi.resultsVulnerabilityScans.bind(vulnerabilityApi),
  };
}

export function complianceScanApiClient() {
  const complianceApi = new ComplianceApi(configuration);
  return {
    startComplianceScan: complianceApi.startComplianceScan.bind(complianceApi),
    statusComplianceScan: complianceApi.statusComplianceScan.bind(complianceApi),
    resultComplianceScan: complianceApi.resultsComplianceScan.bind(complianceApi),
  };
}
