
import HostIcon from '../../../images/attack-graph-icons/graph-node-icons/server.svg';
import ContainerIcon from '../../../images/attack-graph-icons/graph-node-icons/container.svg';
import AWSS3BucketIcon from '../../../images/attack-graph-icons/graph-node-icons/Res_Amazon-Simple-Storage-Service_Bucket_48_Dark.svg';
import AWSEKSCloudIcon from '../../../images/attack-graph-icons/graph-node-icons/Arch_Amazon-EKS-Cloud_48.svg';
import AWSOpenSearchServiceIcon from '../../../images/attack-graph-icons/graph-node-icons/Arch_Amazon-OpenSearch-Service_48.svg';
import AWSRDSAuroraInstanceIcon from '../../../images/attack-graph-icons/graph-node-icons/Res_Amazon-Aurora_Amazon-RDS-Instance_48_Dark.svg';
import AWSRDSMultiAZDbClusterIcon from '../../../images/attack-graph-icons/graph-node-icons/Res_Amazon-RDS_Multi-AZ-DB-Cluster_48_Dark.svg';
import AWSECSTaskIcon from '../../../images/attack-graph-icons/graph-node-icons/Res_Amazon-Elastic-Container-Service_Task_48_Dark.svg';
import AWSLambdaFunctionIcon from '../../../images/attack-graph-icons/graph-node-icons/Res_AWS-Lambda_Lambda-Function_48_Dark.svg';
import AWSEC2NLBIcon from '../../../images/attack-graph-icons/graph-node-icons/Res_Elastic-Load-Balancing_Network-Load-Balancer_48_Dark.svg';
import AWSEC2CLBIcon from '../../../images/attack-graph-icons/graph-node-icons/Res_Elastic-Load-Balancing_Classic-Load-Balancer_48_Dark.svg';
import GCPRootIcon from '../../../images/attack-graph-icons/graph-node-icons/gcp.png';
import AWSRootIcon from '../../../images/attack-graph-icons/graph-node-icons/aws.png';
import AzureRootIcon from '../../../images/attack-graph-icons/graph-node-icons/azure.png';
import OthersRootIcon from '../../../images/attack-graph-icons/graph-node-icons/others.svg';

const mapping = {
  host: HostIcon,
  container: ContainerIcon,
  cloud_root_aws: AWSRootIcon,
  cloud_root_gcp: GCPRootIcon,
  cloud_root_azure: AzureRootIcon,
  cloud_root_others: OthersRootIcon,
  aws_s3_bucket: AWSS3BucketIcon,
  aws_eks_cluster: AWSEKSCloudIcon,
  aws_opensearch_domain: AWSOpenSearchServiceIcon,
  aws_rds_db_instance: AWSRDSAuroraInstanceIcon,
  aws_rds_db_cluster: AWSRDSMultiAZDbClusterIcon,
  aws_ecs_task: AWSECSTaskIcon,
  aws_lambda_function: AWSLambdaFunctionIcon,
  aws_ec2_network_load_balancer: AWSEC2NLBIcon,
  aws_ec2_classic_load_balancer: AWSEC2CLBIcon
};

export function getAssetIcon(id) {
  return mapping[id];
}
