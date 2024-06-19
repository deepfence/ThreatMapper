import {
  ModelCloudComplianceStatusEnum,
  ModelCloudNodeAccountsListReqCloudProviderEnum,
  ModelComplianceStatusEnum,
} from '@/api/generated';

export const isCloudNonOrgNode = (nodeType?: string) => {
  return (
    nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.Aws ||
    nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.Azure ||
    nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.Gcp
  );
};

export const isCloudOrgNode = (nodeType?: string) =>
  nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.AwsOrg ||
  nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.GcpOrg ||
  nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.AzureOrg;

export const isNonCloudNode = (nodeType: string) => {
  return (
    nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.Linux ||
    nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.Kubernetes
  );
};

export const isLinuxNodeType = (nodeType: string) =>
  nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.Linux;

export const isKubernetesNodeType = (nodeType: string) =>
  nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.Kubernetes;

export const isAlarmStatus = (status: string) => {
  return status?.toLowerCase() === ModelCloudComplianceStatusEnum.Alarm;
};
export const isInfoStatus = (status: string) => {
  return status?.toLowerCase() === ModelCloudComplianceStatusEnum.Info;
};
export const isOkStatus = (status: string) => {
  return status?.toLowerCase() === ModelCloudComplianceStatusEnum.Ok;
};
export const isSkipStatus = (status: string) => {
  return status?.toLowerCase() === ModelCloudComplianceStatusEnum.Skip;
};
export const isPassStatus = (status: string) => {
  return status?.toLowerCase() === ModelComplianceStatusEnum.Pass;
};
export const isWarnStatus = (status: string) => {
  return status?.toLowerCase() === ModelComplianceStatusEnum.Warn;
};
export const isNoteStatus = (status: string) => {
  return status?.toLowerCase() === ModelComplianceStatusEnum.Note;
};
export const isDeleteStatus = (status: string) => {
  return (
    status?.toLowerCase() === ModelCloudComplianceStatusEnum.Delete ||
    status?.toLowerCase() === ''
  );
};

export function getDisplayNameOfNodeType(
  nodeType?: ModelCloudNodeAccountsListReqCloudProviderEnum,
) {
  switch (nodeType) {
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Azure:
      return 'Subscription';
    case ModelCloudNodeAccountsListReqCloudProviderEnum.AzureOrg:
      return 'Tenant';
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Aws:
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Gcp:
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Linux:
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Kubernetes:
    case ModelCloudNodeAccountsListReqCloudProviderEnum.AwsOrg:
    case ModelCloudNodeAccountsListReqCloudProviderEnum.GcpOrg:
      return 'Account';
    case undefined:
      throw new Error(`Node type cannot be empty for display name`);
    default:
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = nodeType;
      throw new Error(`Unhandled case: ${_exhaustiveCheck}`);
  }
}

export function getSearchableCloudAccountDisplayName(
  nodeType?: ModelCloudNodeAccountsListReqCloudProviderEnum,
) {
  switch (nodeType) {
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Azure:
      return 'Subscription';
    case ModelCloudNodeAccountsListReqCloudProviderEnum.AzureOrg:
      return 'Tenant';
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Aws:
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Gcp:
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Linux:
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Kubernetes:
      return 'Account';
    case ModelCloudNodeAccountsListReqCloudProviderEnum.AwsOrg:
    case ModelCloudNodeAccountsListReqCloudProviderEnum.GcpOrg:
      return 'Organization account';
    case undefined:
      throw new Error(`Node type cannot be empty for display name`);
    default:
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = nodeType;
      throw new Error(`Unhandled case: ${_exhaustiveCheck}`);
  }
}

export function getDeleteConfirmationDisplayName(
  nodeType?: ModelCloudNodeAccountsListReqCloudProviderEnum,
) {
  switch (nodeType) {
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Azure:
      return 'The Selected subscription, resources and scans related to the subscription will be deleted.';
    case ModelCloudNodeAccountsListReqCloudProviderEnum.AzureOrg:
      return 'The Selected tenant, child subscriptions related to tenant, resources and scans related to tenant will be deleted.';
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Aws:
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Gcp:
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Linux:
    case ModelCloudNodeAccountsListReqCloudProviderEnum.Kubernetes:
      return 'The Selected cloud account, resources and scans related to the account will be deleted.';
    case ModelCloudNodeAccountsListReqCloudProviderEnum.AwsOrg:
    case ModelCloudNodeAccountsListReqCloudProviderEnum.GcpOrg:
      return 'The Selected org cloud account, child accounts related to org account, resources and scans related to the cloud accounts will be deleted.';
    case undefined:
      throw new Error(`Node type cannot be empty for display name`);
    default:
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = nodeType;
      throw new Error(`Unhandled case: ${_exhaustiveCheck}`);
  }
}
