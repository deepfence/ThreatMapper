import { IEdge, INode, ShapeStyle } from '@antv/g6';
import { truncate } from 'lodash-es';
import { colors } from 'tailwind-preset';

import AWSLogo from '@/assets/topology/aws.svg';
import AWSEc2ALBLogo from '@/assets/topology/aws_ec2_application_load_balancer.svg';
import AWSEc2CLBLogo from '@/assets/topology/aws_ec2_classic_load_balancer.svg';
import AWSEc2InstanceLogo from '@/assets/topology/aws_ec2_instance.svg';
import AWSEc2NLBLogo from '@/assets/topology/aws_ec2_network_load_balancer.svg';
import AWSECRRepositoryLogo from '@/assets/topology/aws_ecr_repository.svg';
import AWSECSClusterLogo from '@/assets/topology/aws_ecs_cluster.svg';
import AWSECSTaskLogo from '@/assets/topology/aws_ecs_task.svg';
import AWSLambdaFunctionLogo from '@/assets/topology/aws_lambda_function.svg';
import AWSRDSDBClusterLogo from '@/assets/topology/aws_rds_db_cluster.svg';
import AWSRDSDBInstanceLogo from '@/assets/topology/aws_rds_db_instance.svg';
import AWSS3BucketLogo from '@/assets/topology/aws_s3_bucket.svg';
import AWSLightLogo from '@/assets/topology/aws-light.svg';
import AzureLogo from '@/assets/topology/azure.svg';
import AzureAppServiceFunction from '@/assets/topology/azure_app_service_function_app.svg';
import AzureComputeVirtualMachine from '@/assets/topology/azure_compute_virtual_machine.svg';
import AzureStorageContainer from '@/assets/topology/azure_storage_container.svg';
import AzureStorageQueue from '@/assets/topology/azure_storage_queue.svg';
import AzureStorageTable from '@/assets/topology/azure_storage_table.svg';
import CloudLogo from '@/assets/topology/cloud.svg';
import CloudLightLogo from '@/assets/topology/cloud-light.svg';
import CloudRegionLogo from '@/assets/topology/cloud-region.svg';
import CloudRegionLightLogo from '@/assets/topology/cloud-region-light.svg';
import ContainerLogo from '@/assets/topology/container.svg';
import ContainerImageLogo from '@/assets/topology/container_image.svg';
import ContainerImageLightLogo from '@/assets/topology/container_image-light.svg';
import ContainerLightLogo from '@/assets/topology/container-light.svg';
import DigitalOceanLogo from '@/assets/topology/digital_ocean.svg';
import GCPLogo from '@/assets/topology/gcp.svg';
import GCPComputeInstance from '@/assets/topology/gcp_compute_instance.svg';
import GCPDatabaseInstance from '@/assets/topology/gcp_sql_database_instance.svg';
import GCPStorageBucket from '@/assets/topology/gcp_storage_bucket.svg';
import GCPLightLogo from '@/assets/topology/gcp-light.svg';
import HostLogo from '@/assets/topology/host.svg';
import HostLightLogo from '@/assets/topology/host-light.svg';
import KubernetesClusterLogo from '@/assets/topology/kubernetes-cluster.svg';
import KubernetesClusterLightLogo from '@/assets/topology/kubernetes-cluster-light.svg';
import PodLogo from '@/assets/topology/pod.svg';
import PodLightLogo from '@/assets/topology/pod-light.svg';
import ProcessLogo from '@/assets/topology/process.svg';
import ProcessLightLogo from '@/assets/topology/process-light.svg';
import TheInternetLogo from '@/assets/topology/the-internet.svg';
import { EnhancedDetailedNodeSummary, G6Node } from '@/features/topology/types/graph';
import { Mode, THEME_LIGHT } from '@/theme/ThemeContext';

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

export const nodeStyle = (
  theme: Mode,
  node: EnhancedDetailedNodeSummary,
  override?: ShapeStyle,
) => {
  const isLightTheme = theme === THEME_LIGHT;
  const color = colors[isLightTheme ? 'variables' : 'darkVariables'].DEFAULT;

  const style: ShapeStyle = {
    cursor: 'pointer',
    fill: isLightTheme ? color['bg-card'] : color['bg-map-node'],
  };
  return { ...style, ...override };
};

export const getNodeIconConfig = (theme: Mode, node: EnhancedDetailedNodeSummary) => {
  if (node.df_data && getNodeImage(theme, node.df_data.type ?? '')) {
    return {
      show: true,
      img: getNodeImage(theme, node.df_data.type ?? '', node.df_data.label),
      width: ['pseudo'].includes(node.df_data.type ?? '') ? 35 : 30,
      height: ['pseudo'].includes(node.df_data.type ?? '') ? 35 : 30,
      cursor: 'pointer',
    };
  }
};

export const getShortLabel = (label?: string, nodeType?: string) => {
  if (!label || !label.length) {
    return 'unknown';
  }
  let shortLabel = label;
  if (nodeType === 'process' && label.lastIndexOf('/') >= 0) {
    shortLabel = label.split('/')[label.split('/').length - 1];
  }

  return truncate(shortLabel, { length: 25 });
};

export const onNodeHover = (item: G6Node, enter: boolean) => {
  const model = item.get('model') as EnhancedDetailedNodeSummary | undefined;
  if (enter) {
    item.update({ label: model?.df_data?.label ?? 'unknown' });
  } else {
    item.update({ label: getShortLabel(model?.df_data?.label) });
  }

  setActiveState(item, enter);
  item?.getEdges?.()?.forEach?.((edge) => {
    if (
      !edge?.getModel?.()?.combo_pseudo_center &&
      !edge?.getModel?.()?.combo_pseudo_inner
    ) {
      const source = edge.getSource();
      if (source.getID() !== item.getID()) setActiveState(source, enter);
      const target = edge.getTarget();
      if (target.getID() !== item.getID() && target.getType() !== 'combo')
        setActiveState(target, enter);

      setActiveState(edge, enter);
    }
  });
};

const setActiveState = (item: INode | IEdge, active: boolean) => {
  if (active) {
    item.setState('active', true);
  } else {
    item.clearStates('active');
  }
};

export const getNodeImage = (
  theme: Mode,
  nodeType: string,
  nodeLabel?: string,
): string | undefined => {
  const path = getNodeImagePath(theme, nodeType, nodeLabel);
  if (path) {
    return getImageFullPath(path);
  }
};

const getNodeImagePath = (
  theme: Mode,
  nodeType: string,
  nodeLabel?: string,
): string | undefined => {
  const isDarkTheme = theme === 'dark';

  if (nodeType === 'cloud_provider') {
    if (nodeLabel && nodeLabel === 'aws') {
      return isDarkTheme ? AWSLogo : AWSLightLogo;
    } else if (nodeLabel && nodeLabel === 'digital_ocean') {
      return DigitalOceanLogo;
    } else if (nodeLabel && nodeLabel === 'azure') {
      return AzureLogo;
    } else if (nodeLabel && nodeLabel === 'gcp') {
      return isDarkTheme ? GCPLogo : GCPLightLogo;
    }
    return isDarkTheme ? CloudLogo : CloudLightLogo;
  } else if (nodeType === 'pseudo') {
    return TheInternetLogo;
  } else if (nodeType === 'cloud_region') {
    return isDarkTheme ? CloudRegionLogo : CloudRegionLightLogo;
  } else if (nodeType === 'host') {
    return isDarkTheme ? HostLogo : HostLightLogo;
  } else if (nodeType === 'kubernetes_cluster') {
    return isDarkTheme ? KubernetesClusterLogo : KubernetesClusterLightLogo;
  } else if (nodeType === 'container') {
    return isDarkTheme ? ContainerLogo : ContainerLightLogo;
  } else if (nodeType === 'container_image') {
    return isDarkTheme ? ContainerImageLogo : ContainerImageLightLogo;
  } else if (nodeType === 'pod') {
    return isDarkTheme ? PodLogo : PodLightLogo;
  } else if (nodeType === 'process') {
    return isDarkTheme ? ProcessLogo : ProcessLightLogo;
  } else if (nodeType.startsWith('aws_')) {
    if (nodeType === 'aws_ec2_instance') {
      return AWSEc2InstanceLogo;
    } else if (nodeType === 'aws_eks_cluster') {
      return isDarkTheme ? KubernetesClusterLogo : KubernetesClusterLightLogo;
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
