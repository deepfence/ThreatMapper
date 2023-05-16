import { truncate } from 'lodash-es';

import AWSLogo from '@/assets/topology/aws.png';
import AWSEc2ALBLogo from '@/assets/topology/aws_ec2_application_load_balancer.png';
import AWSEc2CLBLogo from '@/assets/topology/aws_ec2_classic_load_balancer.png';
import AWSEc2InstanceLogo from '@/assets/topology/aws_ec2_instance.png';
import AWSEc2NLBLogo from '@/assets/topology/aws_ec2_network_load_balancer.png';
import AWSECRRepositoryLogo from '@/assets/topology/aws_ecr_repository.png';
import AWSECSClusterLogo from '@/assets/topology/aws_ecs_cluster.png';
import AWSECSTaskLogo from '@/assets/topology/aws_ecs_task.png';
import AWSLambdaFunctionLogo from '@/assets/topology/aws_lambda_function.png';
import AWSRDSDBClusterLogo from '@/assets/topology/aws_rds_db_cluster.png';
import AWSRDSDBInstanceLogo from '@/assets/topology/aws_rds_db_instance.png';
import AWSS3BucketLogo from '@/assets/topology/aws_s3_bucket.png';
import AzureLogo from '@/assets/topology/azure.png';
import AzureAppServiceFunction from '@/assets/topology/azure_app_service_function_app.svg';
import AzureComputeVirtualMachine from '@/assets/topology/azure_compute_virtual_machine.svg';
import AzureStorageContainer from '@/assets/topology/azure_storage_container.svg';
import AzureStorageQueue from '@/assets/topology/azure_storage_queue.svg';
import AzureStorageTable from '@/assets/topology/azure_storage_table.svg';
import CloudLogo from '@/assets/topology/cloud.png';
import CloudRegionLogo from '@/assets/topology/cloud-region.png';
import ContainerLogo from '@/assets/topology/container.png';
import ContainerImageLogo from '@/assets/topology/container_image.png';
import DigitalOceanLogo from '@/assets/topology/digital_ocean.png';
import GCPLogo from '@/assets/topology/gcp.png';
import GCPComputeInstance from '@/assets/topology/gcp_compute_instance.svg';
import GCPDatabaseInstance from '@/assets/topology/gcp_sql_database_instance.svg';
import GCPStorageBucket from '@/assets/topology/gcp_storage_bucket.svg';
import HostLogo from '@/assets/topology/host.png';
import KubernetesClusterLogo from '@/assets/topology/kubernetes-cluster.png';
import PodLogo from '@/assets/topology/pod.png';
import ProcessLogo from '@/assets/topology/process.png';
import TheInternetLogo from '@/assets/topology/the-internet.png';
import { EnhancedDetailedNodeSummary, G6Node } from '@/features/topology/types/graph';
import { showContextMenu } from '@/features/topology/utils/expand-collapse';

export const GraphPalette = {
  NODE_OUTLINE_DARK: '#E5E7EB',
  NODE_OUTLINE_LIGHT: '#1F2937',
  LABEL_TEXT_LIGHT: '#4B5563',
  LABEL_TEXT_DARK: '#D1D5DB',
  LABEL_BACKGROUND_LIGHT: 'white',
  LABEL_BACKGROUND_DARK: '#F9FAFB',
  EDGE_DARK: '#3F83F8',
  EDGE_LIGHT: '#1C64F2',
  COMBO_FILL_DARK: '#1F2937',
  COMBO_FILL_LIGHT: '#EBF5FF',
};

// TODO: remove these legacy colors
export const PALETTE = {
  BLUE: '#55c1e9',
  DEEP_BLUE: '#426ca9',
  DARK_BLUE: '#1D3372',
  DARK_BLUE_HEADLINE: '#1e3374',
  HOT_PINK: '#EA00F7',
  DEEP_PURPLE: '#8a1a9c',
  DEEP_GREY: '#696e72',
  DARK_GREY: '#7f888f',
  MID_GREY: '#909a9c',
  LIGHT_GREY: '#acb1b5',
  BLACK: '#231f20',
  ALERT_CRITICAL: '#f40197',
  ALERT_HIGH: '#9a00f4',
  ALERT_MEDIUM: '#4d01f2',
  ALERT_LOW: '#0080ff',
  ALERT_INFO: '#acb1b5',

  AWS_YELLOW: '#FF9900',
  GOOGLE_BLUE: '#4285F4',
  EDGE_BLUE: '#007fff',
  OFF_WHITE: '#fefefe',
};

export const COLORS = {
  NODE: PALETTE.DARK_GREY,
  NODE_OUTLINE: 'white',
  NODE_SEVERITY_HIGH: PALETTE.ALERT_HIGH,
  NODE_SEVERITY_MEDIUM: PALETTE.ALERT_MEDIUM,
  NODE_SEVERITY_LOW: PALETTE.ALERT_LOW,

  LABEL: 'white',

  EDGE: PALETTE.EDGE_BLUE,
  ACTIVE_EDGE: PALETTE.AWS_YELLOW,

  CLOUD_PROVIDER: PALETTE.DEEP_GREY,
  REGION: PALETTE.DARK_GREY,
  HOST: PALETTE.MID_GREY,
  POD: PALETTE.MID_GREY,
  CONTAINER: PALETTE.MID_GREY,
  PROCESS: PALETTE.LIGHT_GREY,
};

export const nodeStyle = (
  node: EnhancedDetailedNodeSummary,
  override: Record<string, any>,
) => {
  let style: Record<string, string> = {};
  const fill: Record<string, string> = {
    cloud_provider: COLORS.CLOUD_PROVIDER,
    region: COLORS.REGION,
    host: COLORS.HOST,
    pod: COLORS.POD,
    container: COLORS.CONTAINER,
    process: COLORS.PROCESS,
  };
  style.fill = fill[node?.df_data?.type ?? ''] || COLORS.NODE;

  style = { ...style, ...override };
  if (node.df_data && getNodeImage(node.df_data?.type ?? '')) {
    delete style.fill;
  } else if (node?.df_data?.type === 'process') {
    style.fill = COLORS.PROCESS;
  }
  if (showContextMenu(node.df_data)) {
    style.cursor = 'pointer';
  }

  return style;
};

export const getShortLabel = (label?: string) => {
  if (!label || !label.length) {
    return 'unknown';
  }
  let shortLabel = label;
  if (label.lastIndexOf('/') >= 0) {
    shortLabel = label.split('/')[label.split('/').length - 1];
  }

  return truncate(shortLabel, { length: 25 });
};

export const onNodeHover = (item: G6Node, enter: boolean) => {
  const model = item.get('model') as EnhancedDetailedNodeSummary | undefined;
  if (model?.df_data?.type === 'process') {
    if (enter) {
      item.update({ label: model?.df_data?.label ?? 'unknown' });
      item.toFront();
    } else {
      item.update({ label: getShortLabel(model?.df_data?.label) });
    }
  }
};
export const getNodeImage = (
  nodeType: string,
  nodeLabel?: string,
): string | undefined => {
  const path = getNodeImagePath(nodeType, nodeLabel);
  if (path) {
    return getImageFullPath(path);
  }
};

const getNodeImagePath = (nodeType: string, nodeLabel?: string): string | undefined => {
  if (nodeType === 'cloud_provider') {
    if (nodeLabel && nodeLabel === 'aws') {
      return AWSLogo;
    } else if (nodeLabel && nodeLabel === 'digital_ocean') {
      return DigitalOceanLogo;
    } else if (nodeLabel && nodeLabel === 'azure') {
      return AzureLogo;
    } else if (nodeLabel && nodeLabel === 'gcp') {
      return GCPLogo;
    }
    return CloudLogo;
  } else if (nodeType === 'pseudo') {
    return TheInternetLogo;
  } else if (nodeType === 'cloud_region') {
    return CloudRegionLogo;
  } else if (nodeType === 'host') {
    return HostLogo;
  } else if (nodeType === 'kubernetes_cluster') {
    return KubernetesClusterLogo;
  } else if (nodeType === 'container') {
    return ContainerLogo;
  } else if (nodeType === 'container_image') {
    return ContainerImageLogo;
  } else if (nodeType === 'pod') {
    return PodLogo;
  } else if (nodeType === 'process') {
    return ProcessLogo;
  } else if (nodeType.startsWith('aws_')) {
    if (nodeType === 'aws_ec2_instance') {
      return AWSEc2InstanceLogo;
    } else if (nodeType === 'aws_eks_cluster') {
      return KubernetesClusterLogo;
    } else if (nodeType === 'aws_s3_bucket') {
      return AWSS3BucketLogo;
    } else if (nodeType === 'aws_lambda_function') {
      return AWSLambdaFunctionLogo;
    } else if (nodeType === 'aws_ecs_task') {
      return AWSECSTaskLogo;
    } else if (nodeType === 'aws_ecs_cluster') {
      return AWSECSClusterLogo;
    } else if (
      nodeType === 'aws_ecr_repository' ||
      nodeType === 'aws_ecrpublic_repository'
    ) {
      return AWSECRRepositoryLogo;
    } else if (nodeType === 'aws_rds_db_instance') {
      return AWSRDSDBInstanceLogo;
    } else if (nodeType === 'aws_rds_db_cluster') {
      return AWSRDSDBClusterLogo;
    } else if (nodeType === 'aws_ec2_application_load_balancer') {
      return AWSEc2ALBLogo;
    } else if (nodeType === 'aws_ec2_classic_load_balancer') {
      return AWSEc2CLBLogo;
    } else if (nodeType === 'aws_ec2_network_load_balancer') {
      return AWSEc2NLBLogo;
    }
  } else if (nodeType.startsWith('azure_')) {
    if (nodeType === 'azure_app_service_function_app') {
      return AzureAppServiceFunction;
    } else if (nodeType === 'azure_compute_virtual_machine') {
      return AzureComputeVirtualMachine;
    } else if (nodeType === 'azure_storage_container') {
      return AzureStorageContainer;
    } else if (nodeType === 'azure_storage_queue') {
      return AzureStorageQueue;
    } else if (nodeType === 'azure_storage_table') {
      return AzureStorageTable;
    }
  } else if (nodeType.startsWith('gcp_')) {
    if (nodeType === 'gcp_compute_instance') {
      return GCPComputeInstance;
    } else if (nodeType === 'gcp_sql_database_instance') {
      return GCPDatabaseInstance;
    } else if (nodeType === 'gcp_storage_bucket') {
      return GCPStorageBucket;
    } else if (nodeType === 'gcp_compute_disk') {
      return GCPComputeInstance;
    }
  }
};

function getImageFullPath(imageRelativePath: string) {
  return `${location.protocol}//${location.host}${imageRelativePath}`;
}
