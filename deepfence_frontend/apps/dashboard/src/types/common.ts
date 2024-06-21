import {
  ModelCloudComplianceStatusEnum,
  ModelCloudNodeAccountsListReqCloudProviderEnum,
  ModelComplianceStatusEnum,
  ModelMalwareFileSeverityEnum,
  ModelScanResultsActionRequestScanTypeEnum,
  ModelSecretLevelEnum,
  ModelVulnerabilityCveSeverityEnum,
} from '@/api/generated';
import { SeverityEnum } from '@/utils/enum';

export type VulnerabilitySeverityType = ModelVulnerabilityCveSeverityEnum;

export type SecretSeverityType = ModelSecretLevelEnum;
export type MalwareSeverityType = ModelMalwareFileSeverityEnum;
export type PostureSeverityType =
  | ModelComplianceStatusEnum
  | ModelCloudComplianceStatusEnum;

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
  azure_org = 'azure_org',
  azure = 'azure',
  host = 'host',
  kubernetes_cluster = 'kubernetes_cluster',
}

type PostureEnum =
  (typeof ModelCloudNodeAccountsListReqCloudProviderEnum)[keyof typeof ModelCloudNodeAccountsListReqCloudProviderEnum];

export type CloudNodeType = Exclude<PostureEnum, 'kubernetes' | 'linux'>;
export type CloudNodeNonOrgType = Exclude<
  PostureEnum,
  'aws_org' | 'gcp_org' | 'azure_org' | 'linux' | 'kubernetes'
>;

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

export type GenerativeAIIntegrationType = 'openai' | 'amazon-bedrock';

export const isCriticalSeverity = (severity: string) => {
  return severity?.toLowerCase() === SeverityEnum.Critical;
};
export const isHighSeverity = (severity: string) => {
  return severity?.toLowerCase() === SeverityEnum.High;
};
export const isMediumSeverity = (severity: string) => {
  return severity?.toLowerCase() === SeverityEnum.Medium;
};
export const isLowSeverity = (severity: string) => {
  return severity?.toLowerCase() === SeverityEnum.Low;
};
export const isUnknownSeverity = (severity: string) => {
  return (
    severity?.toLowerCase() === SeverityEnum.Unknown || severity?.toLowerCase() === ''
  );
};
