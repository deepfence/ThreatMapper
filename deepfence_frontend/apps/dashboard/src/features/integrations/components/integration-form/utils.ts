import {
  ModelIntegrationFilters,
  ModelNodeIdentifierNodeTypeEnum,
} from '@/api/generated';
import { ScanTypeEnum } from '@/types/common';

export const IntegrationType = {
  slack: 'slack',
  pagerDuty: 'pagerduty',
  email: 'email',
  httpEndpoint: 'http_endpoint',
  microsoftTeams: 'teams',
  splunk: 'splunk',
  sumoLogic: 'sumologic',
  elasticsearch: 'elasticsearch',
  googleChronicle: 'googlechronicle',
  awsSecurityHub: 'aws_security_hub',
  jira: 'jira',
  s3: 's3',
} as const;

export function getIntegratinPrettyName(type: string) {
  switch (type) {
    case IntegrationType.slack:
      return 'Slack';
    case IntegrationType.pagerDuty:
      return 'PagerDuty';
    case IntegrationType.httpEndpoint:
      return 'HTTP Endpoint';
    case IntegrationType.microsoftTeams:
      return 'Microsoft Teams';
    case IntegrationType.splunk:
      return 'Splunk';
    case IntegrationType.sumoLogic:
      return 'Sumo Logic';
    case IntegrationType.elasticsearch:
      return 'Elasticsearch';
    case IntegrationType.googleChronicle:
      return 'Google Chronicle';
    case IntegrationType.awsSecurityHub:
      return 'AWS Security Hub';
    case IntegrationType.jira:
      return 'Jira';
    case IntegrationType.s3:
      return 'S3';
    case IntegrationType.email:
      return 'Email';
    default:
      throw new Error('Integration type not found');
  }
}

export const IntegrationDocsLinkMap: Record<string, string> = {
  slack: 'https://community.deepfence.io/threatmapper/docs/integrations/slack',
  pagerduty: 'https://community.deepfence.io/threatmapper/docs/integrations/pagerduty',
  email: 'https://community.deepfence.io/threatmapper/docs/integrations/email',
  http_endpoint:
    'https://community.deepfence.io/threatmapper/docs/integrations/http-endpoint',
  teams: 'https://community.deepfence.io/threatmapper/docs/integrations/microsoft-teams',
  splunk: 'https://community.deepfence.io/threatmapper/docs/integrations/splunk',
  sumologic: 'https://community.deepfence.io/threatmapper/docs/integrations/sumo-logic',
  elasticsearch:
    'https://community.deepfence.io/threatmapper/docs/integrations/elasticsearch',
  googlechronicle: '',
  aws_security_hub: '',
  jira: 'https://community.deepfence.io/threatmapper/docs/integrations/jira',
  s3: 'https://community.deepfence.io/threatmapper/docs/integrations/s3',
  openai: 'https://community.deepfence.io/threatmapper/docs/integrations/threatrx',
  'amazon-bedrock':
    'https://community.deepfence.io/threatmapper/docs/integrations/threatrx',
} as const;

export const isCloudTrailNotification = (notificationType: string) => {
  return notificationType && notificationType === 'CloudTrailAlert';
};

export const isUserActivityNotification = (notificationType: string) => {
  return notificationType && notificationType === 'UserActivities';
};

export const isVulnerabilityNotification = (notificationType: string) => {
  return notificationType && notificationType === 'Vulnerability';
};

export const isJiraIntegration = (integrationType: string) => {
  return integrationType && integrationType === IntegrationType.jira;
};

export const isCloudComplianceNotification = (notificationType: string) => {
  return notificationType && notificationType === 'CloudCompliance';
};

export const isComplianceNotification = (notificationType: string) => {
  return notificationType && notificationType === 'Compliance';
};

export const getHostsFilter = (nodeIds: ModelIntegrationFilters['node_ids'] = []) => {
  if (!nodeIds) {
    return [];
  }
  return nodeIds.reduce((acc: string[], current) => {
    if (current.node_type === ModelNodeIdentifierNodeTypeEnum.Host) {
      acc.push(current.node_id);
    }
    return acc;
  }, []);
};

export const getImagesFilter = (nodeIds: ModelIntegrationFilters['node_ids'] = []) => {
  if (!nodeIds) {
    return [];
  }
  return nodeIds.reduce((acc: string[], current) => {
    if (current.node_type === ModelNodeIdentifierNodeTypeEnum.Image) {
      acc.push(current.node_id);
    }
    return acc;
  }, []);
};

export const getClustersFilter = (nodeIds: ModelIntegrationFilters['node_ids'] = []) => {
  if (!nodeIds) {
    return [];
  }
  return nodeIds.reduce((acc: string[], current) => {
    if (current.node_type === ModelNodeIdentifierNodeTypeEnum.Cluster) {
      acc.push(current.node_id);
    }
    return acc;
  }, []);
};

export const getCloudAccountsFilter = (
  nodeIds: ModelIntegrationFilters['node_ids'] = [],
) => {
  if (!nodeIds) {
    return [];
  }
  return nodeIds.reduce((acc: string[], current) => {
    if (current.node_type === ModelNodeIdentifierNodeTypeEnum.CloudAccount) {
      acc.push(current.node_id);
    }
    return acc;
  }, []);
};

export const API_SCAN_TYPE_MAP: Record<string, ScanTypeEnum> = {
  Vulnerability: ScanTypeEnum.VulnerabilityScan,
  Secret: ScanTypeEnum.SecretScan,
  Malware: ScanTypeEnum.MalwareScan,
  Compliance: ScanTypeEnum.ComplianceScan,
};

export const scanTypes = ['Secret', 'Vulnerability', 'Malware'];

export const getDisplayNotification = (notificationType: string) => {
  if (isCloudTrailNotification(notificationType)) {
    return 'CloudTrail Alert';
  } else if (isUserActivityNotification(notificationType)) {
    return 'User Activities';
  } else if (isCloudComplianceNotification(notificationType)) {
    return 'Cloud Compliance';
  }
  return notificationType;
};
