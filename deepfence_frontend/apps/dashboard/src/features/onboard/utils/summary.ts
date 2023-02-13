import {
  ModelMalwareScanResult,
  ModelSecretScanResult,
  ModelVulnerabilityScanResult,
} from '@/api/generated';

export function getAccountName(
  account: ModelVulnerabilityScanResult | ModelSecretScanResult | ModelMalwareScanResult,
): string {
  if (account.node_type === 'container' && account.docker_container_name?.length) {
    return account.docker_container_name;
  } else if (account.node_type === 'container' && account.docker_image_name?.length) {
    return account.docker_image_name;
  } else if (account.node_type === 'host' && account.host_name?.length) {
    return account.host_name;
  } else if (
    account.node_type === 'kubernetes' &&
    account.kubernetes_cluster_name?.length
  ) {
    return account.kubernetes_cluster_name;
  }

  if (account.node_name?.length) {
    return account.node_name;
  } else if (account.node_id?.length) {
    return account.node_id;
  }

  return 'Unknown';
}
