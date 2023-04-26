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
}

export { VulnerabilityScanNodeTypeEnum as MalwareScanNodeTypeEnum };
export { VulnerabilityScanNodeTypeEnum as SecretScanNodeTypeEnum };
export { ModelScanResultsActionRequestScanTypeEnum as ScanTypeEnum };

export enum ComplianceScanNodeTypeEnum {
  aws = 'aws',
  aws_org = 'aws_org',
  gcp = 'gcp',
  azure = 'azure',
  host = 'host',
  kubernetes_cluster = 'kubernetes_cluster',
}

export enum ScanStatusEnum {
  complete = 'COMPLETE',
  error = 'ERROR',
  neverScanned = 'NEVER_SCANNED',
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
  azure_container_registry: 'Azure Container Registry',
  docker_hub: 'Docker Registry',
  docker_private_registry: 'Docker Private Registry',
  ecr: 'Amazon ECR',
  gitlab: 'GitLab Registry',
  google_container_registry: 'Google Registry',
  harbor: 'Harbor Registry',
  jfrog_container_registry: 'JFrog Registry',
  quay: 'Quay Registry',
} as const;
