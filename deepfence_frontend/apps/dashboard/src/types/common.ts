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
