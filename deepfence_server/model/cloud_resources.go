package model

var (
	TopologyCloudResourceTypes = []string{
		// AWS specific types
		"aws_ec2_instance", "aws_eks_cluster", "aws_s3_bucket", "aws_lambda_function",
		"aws_ecs_task", "aws_ecs_cluster", "aws_ecr_repository", "aws_ecrpublic_repository",
		"aws_ecs_task", "aws_rds_db_instance", "aws_rds_db_cluster", "aws_ec2_application_load_balancer",
		"aws_ec2_classic_load_balancer", "aws_ec2_network_load_balancer",
		// GCP specific types
		"gcp_compute_instance", "gcp_sql_database_instance", "gcp_storage_bucket", "gcp_compute_disk",
		// Azure specific types
		"azure_compute_virtual_machine", "azure_app_service_function_app", "azure_storage_queue",
		"azure_storage_table", "azure_storage_container",
	}
)
