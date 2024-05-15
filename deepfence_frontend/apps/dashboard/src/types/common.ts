import { ModelScanResultsActionRequestScanTypeEnum } from '@/api/generated';

export type VulnerabilitySeverityType =
  | 'critical'
  | 'high'
  | 'low'
  | 'medium'
  | 'unknown';

export type SecretSeverityType = 'critical' | 'high' | 'low' | 'medium' | 'unknown';
export type MalwareSeverityType = 'critical' | 'high' | 'low' | 'medium' | 'unknown';
export type PostureSeverityType =
  | 'alarm'
  | 'info'
  | 'skip'
  | 'ok'
  | 'pass'
  | 'warn'
  | 'delete'
  | 'note';

export type AllSeverityType =
  | VulnerabilitySeverityType
  | SecretSeverityType
  | MalwareSeverityType
  | PostureSeverityType;

export enum VulnerabilityScanNodeTypeEnum {
  host = 'host',
  kubernetes_cluster = 'kubernetes_cluster',
  registry = 'registry',
  image = 'image',
  imageTag = 'imageTag',
  container = 'container',
  pod = 'pod',
}

export { VulnerabilityScanNodeTypeEnum as MalwareScanNodeTypeEnum };
export { VulnerabilityScanNodeTypeEnum as SecretScanNodeTypeEnum };
export { ModelScanResultsActionRequestScanTypeEnum as ScanTypeEnum };

export enum ComplianceScanNodeTypeEnum {
  aws = 'aws',
  aws_org = 'aws_org',
  gcp = 'gcp',
  gcp_org = 'gcp_org',
  azure = 'azure',
  host = 'host',
  kubernetes_cluster = 'kubernetes_cluster',
}

export enum ScanStatusEnum {
  complete = 'COMPLETE',
  error = 'ERROR',
  neverScanned = 'NEVER_SCANNED',
  stopped = 'CANCELLED',
}

export const RegistryType = {
  azure_container_registry: 'azure_container_registry',
  docker_hub: 'docker_hub',
  docker_private_registry: 'docker_private_registry',
  ecr: 'ecr',
  gitlab: 'gitlab',
  google_container_registry: 'google_container_registry',
  harbor: 'harbor',
  jfrog_container_registry: 'jfrog_container_registry',
  quay: 'quay',
} as const;
export const registryTypeToNameMapping: { [key: string]: string } = {
  azure_container_registry: 'Azure Container',
  docker_hub: 'Docker',
  docker_private_registry: 'Docker Private',
  ecr: 'Amazon ECR',
  gitlab: 'GitLab',
  google_container_registry: 'Google',
  harbor: 'Harbor',
  jfrog_container_registry: 'JFrog',
  quay: 'Quay',
} as const;

export type CloudNodeType = 'aws' | 'azure' | 'gcp';
export const isCloudNode = (nodeType?: string) =>
  nodeType === 'aws' || nodeType === 'azure' || nodeType === 'gcp';
export const isCloudOrgNode = (nodeType?: string) =>
  nodeType === 'aws_org' || nodeType === 'gcp_org';

export type GenerativeAIIntegrationType = 'openai' | 'amazon-bedrock';

export const isCriticalSeverity = (severity: string) => {
  return severity?.toLowerCase() === 'critical';
};
export const isHighSeverity = (severity: string) => {
  return severity?.toLowerCase() === 'high';
};
export const isMediumSeverity = (severity: string) => {
  return severity?.toLowerCase() === 'medium';
};
export const isLowSeverity = (severity: string) => {
  return severity?.toLowerCase() === 'low';
};
export const isUnknownSeverity = (severity: string) => {
  return severity?.toLowerCase() === 'unknown' || severity?.toLowerCase() === '';
};
export const isAlarmStatus = (status: string) => {
  return status?.toLowerCase() === 'alarm';
};
export const isInfoStatus = (status: string) => {
  return status?.toLowerCase() === 'info';
};
export const isOkStatus = (status: string) => {
  return status?.toLowerCase() === 'ok';
};
export const isSkipStatus = (status: string) => {
  return status?.toLowerCase() === 'skip';
};
export const isPassStatus = (status: string) => {
  return status?.toLowerCase() === 'pass';
};
export const isWarnStatus = (status: string) => {
  return status?.toLowerCase() === 'warn';
};
export const isNoteStatus = (status: string) => {
  return status?.toLowerCase() === 'note';
};
export const isDeleteStatus = (status: string) => {
  return status?.toLowerCase() === 'delete' || status?.toLowerCase() === '';
};
