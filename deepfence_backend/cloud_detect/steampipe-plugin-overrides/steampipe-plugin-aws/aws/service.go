package aws

import (
	"context"
	"fmt"
	"path"
	"strings"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/client"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/request"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/accessanalyzer"
	"github.com/aws/aws-sdk-go/service/acm"
	"github.com/aws/aws-sdk-go/service/apigateway"
	"github.com/aws/aws-sdk-go/service/apigatewayv2"
	"github.com/aws/aws-sdk-go/service/applicationautoscaling"
	"github.com/aws/aws-sdk-go/service/auditmanager"
	"github.com/aws/aws-sdk-go/service/autoscaling"
	"github.com/aws/aws-sdk-go/service/backup"
	"github.com/aws/aws-sdk-go/service/cloudformation"
	"github.com/aws/aws-sdk-go/service/cloudfront"
	"github.com/aws/aws-sdk-go/service/cloudsearch"
	"github.com/aws/aws-sdk-go/service/cloudtrail"
	"github.com/aws/aws-sdk-go/service/cloudwatch"
	"github.com/aws/aws-sdk-go/service/cloudwatchlogs"
	"github.com/aws/aws-sdk-go/service/codebuild"
	"github.com/aws/aws-sdk-go/service/codecommit"
	"github.com/aws/aws-sdk-go/service/codepipeline"
	"github.com/aws/aws-sdk-go/service/configservice"
	"github.com/aws/aws-sdk-go/service/costexplorer"
	"github.com/aws/aws-sdk-go/service/databasemigrationservice"
	"github.com/aws/aws-sdk-go/service/dax"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/aws/aws-sdk-go/service/ecr"
	"github.com/aws/aws-sdk-go/service/ecrpublic"
	"github.com/aws/aws-sdk-go/service/ecs"
	"github.com/aws/aws-sdk-go/service/efs"
	"github.com/aws/aws-sdk-go/service/eks"
	"github.com/aws/aws-sdk-go/service/elasticache"
	"github.com/aws/aws-sdk-go/service/elasticbeanstalk"
	"github.com/aws/aws-sdk-go/service/elasticsearchservice"
	"github.com/aws/aws-sdk-go/service/elb"
	"github.com/aws/aws-sdk-go/service/elbv2"
	"github.com/aws/aws-sdk-go/service/emr"
	"github.com/aws/aws-sdk-go/service/eventbridge"
	"github.com/aws/aws-sdk-go/service/firehose"
	"github.com/aws/aws-sdk-go/service/glacier"
	"github.com/aws/aws-sdk-go/service/glue"
	"github.com/aws/aws-sdk-go/service/guardduty"
	"github.com/aws/aws-sdk-go/service/iam"
	"github.com/aws/aws-sdk-go/service/inspector"
	"github.com/aws/aws-sdk-go/service/kinesis"
	"github.com/aws/aws-sdk-go/service/kinesisanalyticsv2"
	"github.com/aws/aws-sdk-go/service/kinesisvideo"
	"github.com/aws/aws-sdk-go/service/kms"
	"github.com/aws/aws-sdk-go/service/lambda"
	"github.com/aws/aws-sdk-go/service/macie2"
	"github.com/aws/aws-sdk-go/service/organizations"
	"github.com/aws/aws-sdk-go/service/rds"
	"github.com/aws/aws-sdk-go/service/redshift"
	"github.com/aws/aws-sdk-go/service/route53"
	"github.com/aws/aws-sdk-go/service/route53domains"
	"github.com/aws/aws-sdk-go/service/route53resolver"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/aws/aws-sdk-go/service/s3control"
	"github.com/aws/aws-sdk-go/service/sagemaker"
	"github.com/aws/aws-sdk-go/service/secretsmanager"
	"github.com/aws/aws-sdk-go/service/securityhub"
	"github.com/aws/aws-sdk-go/service/simpledb"
	"github.com/aws/aws-sdk-go/service/sns"
	"github.com/aws/aws-sdk-go/service/sqs"
	"github.com/aws/aws-sdk-go/service/ssm"
	"github.com/aws/aws-sdk-go/service/sts"
	"github.com/aws/aws-sdk-go/service/waf"
	"github.com/aws/aws-sdk-go/service/wafv2"
	"github.com/aws/aws-sdk-go/service/wellarchitected"

	"github.com/turbot/steampipe-plugin-sdk/plugin"
)

// AccessAnalyzerService returns the service connection for AWS IAM Access Analyzer service
func AccessAnalyzerService(ctx context.Context, d *plugin.QueryData) (*accessanalyzer.AccessAnalyzer, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed AccessAnalyzerService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("accessanalyzer-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*accessanalyzer.AccessAnalyzer), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := accessanalyzer.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// ACMService returns the service connection for AWS ACM service
func ACMService(ctx context.Context, d *plugin.QueryData) (*acm.ACM, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed ACMService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("acm-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*acm.ACM), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := acm.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// APIGatewayService returns the service connection for AWS API Gateway service
func APIGatewayService(ctx context.Context, d *plugin.QueryData) (*apigateway.APIGateway, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed APIGateway")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("apigateway-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*apigateway.APIGateway), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := apigateway.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// APIGatewayV2Service returns the service connection for AWS API Gateway V2 service
func APIGatewayV2Service(ctx context.Context, d *plugin.QueryData) (*apigatewayv2.ApiGatewayV2, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed APIGatewayV2Service")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("apigatewayv2-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*apigatewayv2.ApiGatewayV2), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := apigatewayv2.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// ApplicationAutoScalingService returns the service connection for AWS Application Auto Scaling service
func ApplicationAutoScalingService(ctx context.Context, d *plugin.QueryData) (*applicationautoscaling.ApplicationAutoScaling, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed ApplicationAutoScalingService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("applicationautoscaling-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*applicationautoscaling.ApplicationAutoScaling), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := applicationautoscaling.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// AuditManagerService returns the service connection for AWS Audit Manager service
func AuditManagerService(ctx context.Context, d *plugin.QueryData, region string) (*auditmanager.AuditManager, error) {
	if region == "" {
		return nil, fmt.Errorf("region must be passed AuditManagerService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("auditmanager-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*auditmanager.AuditManager), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := auditmanager.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// AutoScalingService returns the service connection for AWS AutoScaling service
func AutoScalingService(ctx context.Context, d *plugin.QueryData) (*autoscaling.AutoScaling, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed AutoScalingService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("autoscaling-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*autoscaling.AutoScaling), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := autoscaling.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// BackupService returns the service connection for AWS Backup service
func BackupService(ctx context.Context, d *plugin.QueryData) (*backup.Backup, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed BackupService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("backup-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*backup.Backup), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := backup.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// CodeBuildService returns the service connection for AWS CodeBuild service
func CodeBuildService(ctx context.Context, d *plugin.QueryData) (*codebuild.CodeBuild, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed CodeBuildService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("codebuild-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*codebuild.CodeBuild), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := codebuild.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// CodeCommitService returns the service connection for AWS CodeCommit service
func CodeCommitService(ctx context.Context, d *plugin.QueryData) (*codecommit.CodeCommit, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed CodeCommitService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("codecommit-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*codecommit.CodeCommit), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := codecommit.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// CodePipelineService returns the service connection for AWS Codepipeline service
func CodePipelineService(ctx context.Context, d *plugin.QueryData) (*codepipeline.CodePipeline, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed CodePipelineService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("codepipeline-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*codepipeline.CodePipeline), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := codepipeline.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// CloudFrontService returns the service connection for AWS CloudFront service
func CloudFrontService(ctx context.Context, d *plugin.QueryData) (*cloudfront.CloudFront, error) {
	// have we already created and cached the service?
	serviceCacheKey := "cloudfront"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*cloudfront.CloudFront), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, GetDefaultAwsRegion(d))
	if err != nil {
		return nil, err
	}
	svc := cloudfront.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// CloudFormationService returns the service connection for AWS CloudFormation service
func CloudFormationService(ctx context.Context, d *plugin.QueryData) (*cloudformation.CloudFormation, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed CloudFormationService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("cloudformation-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*cloudformation.CloudFormation), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := cloudformation.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// CloudSearchService returns the service connection for AWS CloudSearch service
func CloudSearchService(ctx context.Context, d *plugin.QueryData) (*cloudsearch.CloudSearch, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed CloudSearchService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("cloudsearch-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*cloudsearch.CloudSearch), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := cloudsearch.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// CloudWatchService returns the service connection for AWS Cloud Watch service
func CloudWatchService(ctx context.Context, d *plugin.QueryData) (*cloudwatch.CloudWatch, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed CloudWatchService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("cloudwatch-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*cloudwatch.CloudWatch), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := cloudwatch.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// CloudWatchLogsService returns the service connection for AWS Cloud Watch Logs service
func CloudWatchLogsService(ctx context.Context, d *plugin.QueryData) (*cloudwatchlogs.CloudWatchLogs, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed CloudWatchLogsService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("cloudwatchlogs-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*cloudwatchlogs.CloudWatchLogs), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := cloudwatchlogs.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// CloudTrailService returns the service connection for AWS CloudTrail service
func CloudTrailService(ctx context.Context, d *plugin.QueryData) (*cloudtrail.CloudTrail, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed CloudTrailService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("cloudtrail-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*cloudtrail.CloudTrail), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := cloudtrail.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// CostExplorerService returns the service connection for AWS Cost Explorer service
func CostExplorerService(ctx context.Context, d *plugin.QueryData) (*costexplorer.CostExplorer, error) {
	// have we already created and cached the service?
	serviceCacheKey := "costexplorer"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*costexplorer.CostExplorer), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, GetDefaultAwsRegion(d))
	if err != nil {
		return nil, err
	}
	svc := costexplorer.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// DaxService returns the service connection for AWS DAX service
func DaxService(ctx context.Context, d *plugin.QueryData) (*dax.DAX, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed DaxService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("dax-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*dax.DAX), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := dax.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// DatabaseMigrationService returns the service connection for AWS Database Migration service
func DatabaseMigrationService(ctx context.Context, d *plugin.QueryData) (*databasemigrationservice.DatabaseMigrationService, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed DatabaseMigrationService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("databasemigrationservice-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*databasemigrationservice.DatabaseMigrationService), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := databasemigrationservice.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// DynamoDbService returns the service connection for AWS DynamoDb service
func DynamoDbService(ctx context.Context, d *plugin.QueryData) (*dynamodb.DynamoDB, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed DynamoDbService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("dynamodb-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*dynamodb.DynamoDB), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := dynamodb.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// Ec2Service returns the service connection for AWS EC2 service
func Ec2Service(ctx context.Context, d *plugin.QueryData, region string) (*ec2.EC2, error) {
	if region == "" {
		return nil, fmt.Errorf("region must be passed Ec2Service")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("ec2-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*ec2.EC2), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := ec2.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// EcrService returns the service connection for AWS ECR service
func EcrService(ctx context.Context, d *plugin.QueryData) (*ecr.ECR, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed EcrService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("ecr-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*ecr.ECR), nil
	}

	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := ecr.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// EcrPublicService returns the service connection for AWS ECRPublic service
func EcrPublicService(ctx context.Context, d *plugin.QueryData) (*ecrpublic.ECRPublic, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed EcrPublicService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("ecrpublic-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*ecrpublic.ECRPublic), nil
	}

	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := ecrpublic.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// EcsService returns the service connection for AWS ECS service
func EcsService(ctx context.Context, d *plugin.QueryData) (*ecs.ECS, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed EcsService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("ecs-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*ecs.ECS), nil
	}

	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := ecs.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// EfsService returns the service connection for AWS Elastic File System service
func EfsService(ctx context.Context, d *plugin.QueryData) (*efs.EFS, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed EfsService")
	}

	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("efs-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*efs.EFS), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := efs.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// EksService returns the service connection for AWS EKS service
func EksService(ctx context.Context, d *plugin.QueryData) (*eks.EKS, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed EksService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("eks-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*eks.EKS), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := eks.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// ElasticBeanstalkService returns the service connection for AWS ElasticBeanstalk service
func ElasticBeanstalkService(ctx context.Context, d *plugin.QueryData) (*elasticbeanstalk.ElasticBeanstalk, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed ElasticBeanstalkService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("elasticbeanstalk-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*elasticbeanstalk.ElasticBeanstalk), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := elasticbeanstalk.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// ElastiCacheService returns the service connection for AWS ElastiCache service
func ElastiCacheService(ctx context.Context, d *plugin.QueryData) (*elasticache.ElastiCache, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed ElastiCache")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("elasticache-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*elasticache.ElastiCache), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := elasticache.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// ElasticsearchService returns the service connection for AWS Elasticsearch service
func ElasticsearchService(ctx context.Context, d *plugin.QueryData) (*elasticsearchservice.ElasticsearchService, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed ElasticsearchService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("elasticsearch-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*elasticsearchservice.ElasticsearchService), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := elasticsearchservice.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// ELBv2Service returns the service connection for AWS EC2 service
func ELBv2Service(ctx context.Context, d *plugin.QueryData) (*elbv2.ELBV2, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed ELBv2Service")
	}

	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("elbv2-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*elbv2.ELBV2), nil
	}

	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := elbv2.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// ELBService returns the service connection for AWS ELB Classic service
func ELBService(ctx context.Context, d *plugin.QueryData) (*elb.ELB, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed ELBv2Service")
	}

	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("elb-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*elb.ELB), nil
	}

	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := elb.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// EventBridgeService returns the service connection for AWS EventBridge service
func EventBridgeService(ctx context.Context, d *plugin.QueryData) (*eventbridge.EventBridge, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed EventBridgeService")
	}

	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("eventbridge-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*eventbridge.EventBridge), nil
	}

	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := eventbridge.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// EmrService returns the service connection for AWS EMR service
func EmrService(ctx context.Context, d *plugin.QueryData) (*emr.EMR, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed EmrService")
	}

	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("emr-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*emr.EMR), nil
	}

	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := emr.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// FirehoseService returns the service connection for AWS Kinesis Firehose service
func FirehoseService(ctx context.Context, d *plugin.QueryData) (*firehose.Firehose, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed FirehoseService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("firehose-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*firehose.Firehose), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := firehose.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// GlacierService returns the service connection for AWS Glacier service
func GlacierService(ctx context.Context, d *plugin.QueryData) (*glacier.Glacier, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed GlacierService")
	}

	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("glacier-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*glacier.Glacier), nil
	}

	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := glacier.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// GlueService returns the service connection for AWS Glue service
func GlueService(ctx context.Context, d *plugin.QueryData) (*glue.Glue, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed GlueService")
	}

	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("glue-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*glue.Glue), nil
	}

	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := glue.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// GuardDutyService returns the service connection for AWS GuardDuty service
func GuardDutyService(ctx context.Context, d *plugin.QueryData) (*guardduty.GuardDuty, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed GuardDutyService")
	}

	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("guardduty-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*guardduty.GuardDuty), nil
	}

	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := guardduty.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// IAMService returns the service connection for AWS IAM service
func IAMService(ctx context.Context, d *plugin.QueryData) (*iam.IAM, error) {
	// have we already created and cached the service?
	serviceCacheKey := "iam"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*iam.IAM), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, GetDefaultAwsRegion(d))
	if err != nil {
		return nil, err
	}
	// svc := iam.New(session.New(&aws.Config{MaxRetries: aws.Int(10)}))
	svc := iam.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// InspectorService returns the service connection for AWS Inspector service
func InspectorService(ctx context.Context, d *plugin.QueryData) (*inspector.Inspector, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed InspectorService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("inspector-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*inspector.Inspector), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := inspector.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// KinesisService returns the service connection for AWS Kinesis service
func KinesisService(ctx context.Context, d *plugin.QueryData) (*kinesis.Kinesis, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed KinesisService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("kinesis-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*kinesis.Kinesis), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := kinesis.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// KinesisAnalyticsV2Service returns the service connection for AWS Kinesis AnalyticsV2 service
func KinesisAnalyticsV2Service(ctx context.Context, d *plugin.QueryData) (*kinesisanalyticsv2.KinesisAnalyticsV2, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed KinesisAnalyticsV2Service")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("kinesisanalyticsv2-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*kinesisanalyticsv2.KinesisAnalyticsV2), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := kinesisanalyticsv2.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// KinesisVideoService returns the service connection for AWS Kinesis Video service
func KinesisVideoService(ctx context.Context, d *plugin.QueryData) (*kinesisvideo.KinesisVideo, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed Kinesis Video")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("kinesisvideo-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*kinesisvideo.KinesisVideo), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := kinesisvideo.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// KMSService returns the service connection for AWS KMS service
func KMSService(ctx context.Context, d *plugin.QueryData) (*kms.KMS, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed KMSService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("kms-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*kms.KMS), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := kms.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// LambdaService returns the service connection for AWS Lambda service
func LambdaService(ctx context.Context, d *plugin.QueryData) (*lambda.Lambda, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed LambdaService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("lambda-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*lambda.Lambda), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := lambda.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// Macie2Service returns the service connection for AWS Macie2 service
func Macie2Service(ctx context.Context, d *plugin.QueryData) (*macie2.Macie2, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed Macie2Service")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("macie2-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*macie2.Macie2), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := macie2.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// OrganizationService returns the service connection for AWS Organization service
func OrganizationService(ctx context.Context, d *plugin.QueryData) (*organizations.Organizations, error) {
	// have we already created and cached the service?
	serviceCacheKey := "Organization"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*organizations.Organizations), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, GetDefaultAwsRegion(d))
	if err != nil {
		return nil, err
	}
	svc := organizations.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// ConfigService returns the service connection for AWS Config  service
func ConfigService(ctx context.Context, d *plugin.QueryData) (*configservice.ConfigService, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed ConfigService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("config-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*configservice.ConfigService), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := configservice.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// RDSService returns the service connection for AWS RDS service
func RDSService(ctx context.Context, d *plugin.QueryData) (*rds.RDS, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed RDSService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("rds-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*rds.RDS), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := rds.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// RedshiftService returns the service connection for AWS Redshift service
func RedshiftService(ctx context.Context, d *plugin.QueryData) (*redshift.Redshift, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed Redshift")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("redshift-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*redshift.Redshift), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := redshift.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// Route53DomainsService returns the service connection for AWS route53 domains service
func Route53DomainsService(ctx context.Context, d *plugin.QueryData) (*route53domains.Route53Domains, error) {
	region := "us-east-1"
	if region == "" {
		return nil, fmt.Errorf("region must be passed Route53Domains")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("route53domain-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*route53domains.Route53Domains), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err

	}
	svc := route53domains.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// Route53ResolverService returns the service connection for AWS route53resolver service
func Route53ResolverService(ctx context.Context, d *plugin.QueryData) (*route53resolver.Route53Resolver, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed Route53Resolver")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("route53resolver-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*route53resolver.Route53Resolver), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := route53resolver.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// Route53Service returns the service connection for AWS route53 service
func Route53Service(ctx context.Context, d *plugin.QueryData) (*route53.Route53, error) {
	// have we already created and cached the service?
	serviceCacheKey := "route53"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*route53.Route53), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, GetDefaultAwsRegion(d))
	if err != nil {
		return nil, err
	}
	svc := route53.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// SecretsManagerService returns the service connection for AWS secretsManager service
func SecretsManagerService(ctx context.Context, d *plugin.QueryData) (*secretsmanager.SecretsManager,
	error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed SecretsManagerService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("secretsmanager-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*secretsmanager.SecretsManager), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := secretsmanager.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// SecurityHubService returns the service connection for AWS securityHub service
func SecurityHubService(ctx context.Context, d *plugin.QueryData) (*securityhub.SecurityHub, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed SecurityHubService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("securityhub-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*securityhub.SecurityHub), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := securityhub.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// S3ControlService returns the service connection for AWS s3control service
func S3ControlService(ctx context.Context, d *plugin.QueryData, region string) (*s3control.S3Control, error) {
	if region == "" {
		return nil, fmt.Errorf("region must be passed S3ControlService")
	}

	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("s3control-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*s3control.S3Control), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := s3control.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// S3Service returns the service connection for AWS S3 service
func S3Service(ctx context.Context, d *plugin.QueryData, region string) (*s3.S3, error) {
	if region == "" {
		return nil, fmt.Errorf("region must be passed S3Service")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("s3-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*s3.S3), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := s3.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// SageMakerService returns the service connection for AWS SageMaker service
func SageMakerService(ctx context.Context, d *plugin.QueryData) (*sagemaker.SageMaker, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed SageMakerService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("sagemaker-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*sagemaker.SageMaker), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := sagemaker.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// SimpleDBService returns the service connection for AWS SimpleDB service
func SimpleDBService(ctx context.Context, d *plugin.QueryData) (*simpledb.SimpleDB, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed SimpleDBService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("simpledb-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*simpledb.SimpleDB), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := simpledb.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// SNSService returns the service connection for AWS SNS service
func SNSService(ctx context.Context, d *plugin.QueryData) (*sns.SNS, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed SNSService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("sns-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*sns.SNS), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := sns.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// SQSService returns the service connection for AWS SQS service
func SQSService(ctx context.Context, d *plugin.QueryData) (*sqs.SQS, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed SQSService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("sqs-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*sqs.SQS), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := sqs.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// SsmService returns the service connection for AWS SSM service
func SsmService(ctx context.Context, d *plugin.QueryData) (*ssm.SSM, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed SsmService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("ssm-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*ssm.SSM), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := ssm.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// StsService returns the service connection for AWS STS service
func StsService(ctx context.Context, d *plugin.QueryData) (*sts.STS, error) {
	// have we already created and cached the service?
	serviceCacheKey := "sts"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*sts.STS), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, GetDefaultAwsRegion(d))
	if err != nil {
		return nil, err
	}
	svc := sts.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// WAFService returns the service connection for AWS WAF service
func WAFService(ctx context.Context, d *plugin.QueryData) (*waf.WAF, error) {

	// have we already created and cached the service?
	serviceCacheKey := "waf"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*waf.WAF), nil
	}

	// so it was not in cache - create service
	sess, err := getSession(ctx, d, GetDefaultAwsRegion(d))
	if err != nil {
		return nil, err
	}
	svc := waf.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// WAFv2Service returns the service connection for AWS WAFv2 service
func WAFv2Service(ctx context.Context, d *plugin.QueryData, region string) (*wafv2.WAFV2, error) {
	if region == "" {
		return nil, fmt.Errorf("region must be passed WAFv2")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("wafv2-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*wafv2.WAFV2), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := wafv2.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

// WellArchitectedService returns the service connection for AWS Well-Architected service
func WellArchitectedService(ctx context.Context, d *plugin.QueryData) (*wellarchitected.WellArchitected, error) {
	region := d.KeyColumnQualString(matrixKeyRegion)
	if region == "" {
		return nil, fmt.Errorf("region must be passed WellArchitectedService")
	}
	// have we already created and cached the service?
	serviceCacheKey := fmt.Sprintf("wellarchitected-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*wellarchitected.WellArchitected), nil
	}
	// so it was not in cache - create service
	sess, err := getSession(ctx, d, region)
	if err != nil {
		return nil, err
	}
	svc := wellarchitected.New(sess)
	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)

	return svc, nil
}

func getSession(_ context.Context, d *plugin.QueryData, region string) (*session.Session, error) {
	sessionCacheKey := fmt.Sprintf("session-%s", region)
	if cachedData, ok := d.ConnectionManager.Cache.Get(sessionCacheKey); ok {
		return cachedData.(*session.Session), nil
	}

	// If seesion was not in cache - create a session and saave to cache

	// get aws config info
	awsConfig := GetConfig(d.Connection)

	// session default configuration
	sessionOptions := session.Options{
		SharedConfigState: session.SharedConfigEnable,
		Config: aws.Config{
			Region:     &region,
			MaxRetries: aws.Int(10),
			Retryer:    NewConnectionErrRetryer(10),
		},
	}

	if awsConfig.Profile != nil {
		sessionOptions.Profile = *awsConfig.Profile
	}

	if awsConfig.AccessKey != nil && awsConfig.SecretKey == nil {
		return nil, fmt.Errorf("Partial credentials found in connection config, missing: secret_key")
	} else if awsConfig.SecretKey != nil && awsConfig.AccessKey == nil {
		return nil, fmt.Errorf("Partial credentials found in connection config, missing: access_key")
	} else if awsConfig.AccessKey != nil && awsConfig.SecretKey != nil {
		sessionOptions.Config.Credentials = credentials.NewStaticCredentials(
			*awsConfig.AccessKey, *awsConfig.SecretKey, "",
		)

		if awsConfig.SessionToken != nil {
			sessionOptions.Config.Credentials = credentials.NewStaticCredentials(
				*awsConfig.AccessKey, *awsConfig.SecretKey, *awsConfig.SessionToken,
			)
		}
	}

	sess, err := session.NewSessionWithOptions(sessionOptions)
	if err != nil {
		return nil, err
	}

	// save session in cache
	d.ConnectionManager.Cache.Set(sessionCacheKey, sess)

	return sess, nil
}

// GetDefaultAwsRegion returns the default region for AWS partiton
// if not set by Env variable or in aws profile
func GetDefaultAwsRegion(d *plugin.QueryData) string {
	allAwsRegions := []string{
		"af-south-1", "ap-east-1", "ap-northeast-1", "ap-northeast-2", "ap-northeast-3", "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ca-central-1", "eu-central-1", "eu-north-1", "eu-south-1", "eu-west-1", "eu-west-2", "eu-west-3", "me-south-1", "sa-east-1", "us-east-1", "us-east-2", "us-west-1", "us-west-2", "us-gov-east-1", "us-gov-west-1", "cn-north-1", "cn-northwest-1"}

	// have we already created and cached the service?
	serviceCacheKey := "GetDefaultAwsRegion"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(string)
	}

	// get aws config info
	awsConfig := GetConfig(d.Connection)

	var regions []string
	var region string

	if awsConfig.Regions != nil {
		regions = awsConfig.Regions
		region = regions[0]
	} else {
		session, err := session.NewSessionWithOptions(session.Options{
			SharedConfigState: session.SharedConfigEnable,
		})
		if err != nil {
			panic(err)
		}
		if session != nil && session.Config != nil {
			region = *session.Config.Region
		}

		if region != "" {
			regions = []string{region}
		}
	}

	validPatterns := []string{}
	invalidPatterns := []string{}
	for _, namePattern := range regions {
		validRegions := []string{}
		for _, validRegion := range allAwsRegions {
			if ok, _ := path.Match(namePattern, validRegion); ok {
				validRegions = append(validRegions, validRegion)
			}
		}
		if len(validRegions) == 0 {
			invalidPatterns = append(invalidPatterns, namePattern)
		} else {
			validPatterns = append(validPatterns, namePattern)
		}
	}

	if len(validPatterns) == 0 && awsConfig.Regions != nil {
		panic("\nconnection config have invalid \"regions\": " + strings.Join(invalidPatterns, ", ") + ". Edit your connection configuration file and then restart Steampipe")
	}

	if region == "" {
		region = "us-east-1"
	} else {
		if strings.HasPrefix(region, "us-gov") {
			region = "us-gov-east-1"
		} else if strings.HasPrefix(region, "cn") {
			region = "cn-north-1"
		} else {
			region = "us-east-1"
		}
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, region)
	return region
}

// Function from https://github.com/panther-labs/panther/blob/v1.16.0/pkg/awsretry/connection_retryer.go
func NewConnectionErrRetryer(maxRetries int) *ConnectionErrRetryer {
	return &ConnectionErrRetryer{
		DefaultRetryer: client.DefaultRetryer{
			NumMaxRetries: maxRetries, // MUST be set or all retrying is skipped!
		},
	}
}

// ConnectionErrRetryer wraps the SDK's built in DefaultRetryer adding customization
// to retry `connection reset by peer` errors.
// Note: This retryer should be used for either idempotent operations or for operations
// where performing duplicate requests to AWS is acceptable.
// See also: https://github.com/aws/aws-sdk-go/issues/3027#issuecomment-567269161
type ConnectionErrRetryer struct {
	client.DefaultRetryer
}

func (r ConnectionErrRetryer) ShouldRetry(req *request.Request) bool {
	if req.Error != nil {
		if strings.Contains(req.Error.Error(), "connection reset by peer") {
			return true
		}
	}

	// Fallback to SDK's built in retry rules
	return r.DefaultRetryer.ShouldRetry(req)
}
