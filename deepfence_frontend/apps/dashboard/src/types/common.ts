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

export enum VulnerabilityScanNodeTypeEnum {
  host = 'host',
  kubernetes_cluster = 'kubernetes_cluster',
  registry = 'registry',
  image = 'image',
  imageTag = 'imageTag',
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
