import {
  ModelCloudComplianceStatusEnum,
  ModelCloudNodeAccountInfoRefreshStatusEnum,
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
  if (!nodeType) {
    throw new Error(`Node type cannot be empty for display name`);
  }

  if (nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.Azure) {
    return 'Subscription';
  } else if (nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.AzureOrg) {
    return 'Tenant';
  } else if (nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.Gcp) {
    return 'Project';
  } else if (nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.GcpOrg) {
    return 'Organization Project';
  } else {
    return 'Account';
  }
}

export function getSearchableCloudAccountDisplayName(
  nodeType?: ModelCloudNodeAccountsListReqCloudProviderEnum,
) {
  if (!nodeType) {
    throw new Error(`Node type cannot be empty for display name`);
  }
  if (nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.Azure) {
    return 'Subscription';
  } else if (nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.AzureOrg) {
    return 'Tenant';
  } else if (nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.Gcp) {
    return 'Project';
  } else if (nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.GcpOrg) {
    return 'Organization project';
  } else if (isCloudOrgNode(nodeType)) {
    return 'Organization account';
  } else {
    return 'Account';
  }
}

export function getDeleteConfirmationDisplayName(
  nodeType?: ModelCloudNodeAccountsListReqCloudProviderEnum,
) {
  if (!nodeType) {
    throw new Error(`Node type cannot be empty for display name`);
  }
  if (nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.Azure) {
    return 'The Selected subscription, resources and scans related to the subscription will be deleted.';
  } else if (nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.AzureOrg) {
    return 'The Selected tenant, child subscriptions related to tenant, resources and scans related to tenant will be deleted.';
  } else if (nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.Gcp) {
    return 'The Selected project, resources and scans related to the project will be deleted.';
  } else if (nodeType === ModelCloudNodeAccountsListReqCloudProviderEnum.GcpOrg) {
    return 'The Selected organization project, child projects related to organization project, resources and scans related to organization project will be deleted.';
  } else if (isCloudOrgNode()) {
    return 'The Selected organization cloud account, child accounts related to organization account, resources and scans related to the cloud accounts will be deleted.';
  } else {
    return 'The Selected cloud account, resources and scans related to the account will be deleted.';
  }
}

export const isRefreshAccountFailed = (status: string): boolean => {
  if (status?.length && ModelCloudNodeAccountInfoRefreshStatusEnum.Error === status) {
    return true;
  }
  return false;
};
