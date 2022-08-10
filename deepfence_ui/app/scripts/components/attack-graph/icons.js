
import GCPRootIcon from '../../../images/attack-graph-icons/graph-node-icons/gcp.png';
import AWSRootIcon from '../../../images/attack-graph-icons/graph-node-icons/aws.png';
import AzureRootIcon from '../../../images/attack-graph-icons/graph-node-icons/azure.png';
import OthersRootIcon from '../../../images/attack-graph-icons/graph-node-icons/others.svg';
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
import AWSECRRegistry from '../../../images/attack-graph-icons/graph-node-icons/Res_Amazon-Elastic-Container-Registry_Registry_48_Dark.svg';
import AWSIAMRole from '../../../images/attack-graph-icons/graph-node-icons/Res_AWS-Identity-Access-Management_Role_48_Dark.svg';
import AWSEC2Instance from '../../../images/attack-graph-icons/graph-node-icons/Res_Amazon-EC2_Instance_48_Dark.svg';
import AWSECSService from '../../../images/attack-graph-icons/graph-node-icons/Res_Amazon-Elastic-Container-Service_Service_48_Dark.svg';
import AzureVirtualMachine from '../../../images/attack-graph-icons/graph-node-icons/10021-icon-service-Virtual-Machine.svg';
import AzureStorageContainer from '../../../images/attack-graph-icons/graph-node-icons/10839-icon-service-Storage-Container.svg';
import AzureStorageAccounts from '../../../images/attack-graph-icons/graph-node-icons/10086-icon-service-Storage-Accounts.svg';
import AzureMysqlServer from '../../../images/attack-graph-icons/graph-node-icons/10122-icon-service-Azure-Database-MySQL-Server.svg';
import GCPComputEngine from '../../../images/attack-graph-icons/graph-node-icons/gcp_compute_engine.svg';
import GCPCloudStorage from '../../../images/attack-graph-icons/graph-node-icons/gcp_cloud_storage.svg';
import GCPCloudSQL from '../../../images/attack-graph-icons/graph-node-icons/gcp_cloud_sql.svg';
import GCPCloudFunctions from '../../../images/attack-graph-icons/graph-node-icons/gcp_cloud_functions.svg';


const mapping = {
  host: HostIcon,
  container: ContainerIcon,
  cloud_root_aws: AWSRootIcon,
  cloud_root_gcp: GCPRootIcon,
  cloud_root_azure: AzureRootIcon,
  cloud_root_others: OthersRootIcon,
  // aws
  aws_s3_bucket: AWSS3BucketIcon,
  aws_eks_cluster: AWSEKSCloudIcon,
  aws_opensearch_domain: AWSOpenSearchServiceIcon,
  aws_rds_db_instance: AWSRDSAuroraInstanceIcon,
  aws_rds_db_cluster: AWSRDSMultiAZDbClusterIcon,
  aws_ecs_task: AWSECSTaskIcon,
  aws_lambda_function: AWSLambdaFunctionIcon,
  aws_ec2_network_load_balancer: AWSEC2NLBIcon,
  aws_ec2_classic_load_balancer: AWSEC2CLBIcon,
  aws_ecrpublic_repository: AWSECRRegistry,
  aws_ecr_repository: AWSECRRegistry,
  aws_vpc_security_group_rule: AWSIAMRole,
  aws_ecs_task_definition: AWSECSTaskIcon,
  aws_ec2_instance: AWSEC2Instance,
  aws_ecs_service: AWSECSService,

  // azure
  azure_compute_virtual_machine: AzureVirtualMachine,
  azure_storage_container: AzureStorageContainer,
  azure_storage_account: AzureStorageAccounts,
  azure_storage_blob: AzureRootIcon,
  azure_storage_table: AzureRootIcon,
  azure_log_profile: AzureRootIcon,
  azure_mysql_server: AzureMysqlServer,

  // gcp
  gcp_compute_instance: GCPComputEngine,
  gcp_storage_bucket: GCPCloudStorage,
  gcp_sql_database_instance: GCPCloudSQL,
  gcp_cloudfunctions_function: GCPCloudFunctions
};

export function getAssetIcon(id) {
  return mapping[id];
}
