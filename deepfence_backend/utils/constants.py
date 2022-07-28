import datetime
import os
from collections import defaultdict

DEEPFENCE_SUPPORT_EMAIL = "support@deepfence.io"
DEEPFENCE_COMMUNITY_EMAIL = "community@deepfence.io"

MIN_PASSWORD_LENGTH = 8
PASSWORD_VALIDATION_FAIL_MSG = """
Minimum password length is {}.

Password should contain
- at least 1 uppercase character (A-Z)
- at least 1 lowercase character (a-z)
- at least 1 digit (0-9)
- at least 1 special character (punctuation)
""".format(MIN_PASSWORD_LENGTH)

"""
ADMIN - Only admin can access this resource.
NORMAL_USER - Only user can access this resource.
"""


class USER_ROLES:
    ADMIN_USER = "admin"
    NORMAL_USER = "user"
    READ_ONLY_USER = "read_only_user"


SECRET_TOKEN_LENGTH = 16

# Email templates
INVITE_ACCEPT_LINK = "/#/invite-accept/?invite_code={code}"
INVITE_USER_EMAIL_SUBJECT = "Invitation to access Deepfence Dashboard"
INVITE_USER_EMAIL_HTML = """
<html></html>
<head></head>
<body>
Dear User,

You've been invited to access Deepfence Dashboard.<br>

Please click on the link to register. <a href='{registration_url}'>Register</a>
</body>
</html>
"""

PASSWORD_CHANGE_EMAIL_SUBJECT = "Deepfence - Your password has been updated successfully."
PASSWORD_CHANGE_EMAIL_HTML = """
Dear User,

Your password has been updated successfully.<br>

If you have not changed it, please contact your admin.
"""

PASSWORD_RESET_LINK = "/#/password-reset/?reset_code={code}"
PASSWORD_RESET_EMAIL_SUBJECT = "Deepfence - Reset your password"
PASSWORD_RESET_EMAIL_HTML = """
Dear User,

Click on the below link to reset your password.<br>
<a href='{password_reset_link}'>Reset Password</a><br><br>

If you did not initiate forgot password, please contact your admin.
"""

PASSWORD_RESET_SUCCESS_EMAIL_SUBJECT = "Deepfence - Your password has been reset successfully"
PASSWORD_RESET_SUCCESS_EMAIL_HTML = """
Hi <i>{name}</i>,<br><br>

Your password has been reset successfully.<br><br>

If you did not initiate forgot password, please contact your admin.
"""

# In seconds
INVITE_EXPIRY = 86400
PASSWORD_RESET_CODE_EXPIRY = 3600

MAX_TOTAL_SEVERITY_SCORE = 500.0  # match this value with deepfence_console/deepaudit/main.go constant
MAX_TOP_EXPLOITABLE_VULNERABILITIES = 1000
VULNERABILITY_SCAN_QUEUE = "celery_vulnerability_scan_queue"
VULNERABILITY_SCAN_PRIORITY_QUEUE = "celery_vulnerability_scan_priority_queue"
CELERY_NODE_ACTION_QUEUE = "celery_node_action_queue"

INTEGRATION_TYPE_EMAIL = "email"
INTEGRATION_TYPE_SLACK = "slack"
INTEGRATION_TYPE_PAGERDUTY = "pagerduty"
INTEGRATION_TYPE_SPLUNK = "splunk"
INTEGRATION_TYPE_ES = "elasticsearch"
INTEGRATION_TYPE_S3 = "s3"
INTEGRATION_TYPE_HTTP = "http_endpoint"
INTEGRATION_TYPE_GOOGLE_CHRONICLE = "google_chronicle"
INTEGRATION_TYPE_JIRA = "jira"
INTEGRATION_TYPE_SUMO_LOGIC = "sumo_logic"
INTEGRATION_TYPE_MICROSOFT_TEAMS = "microsoft_teams"
INTEGRATION_TYPES = [
    INTEGRATION_TYPE_EMAIL, INTEGRATION_TYPE_SLACK, INTEGRATION_TYPE_PAGERDUTY, INTEGRATION_TYPE_SPLUNK,
    INTEGRATION_TYPE_ES, INTEGRATION_TYPE_S3, INTEGRATION_TYPE_HTTP, INTEGRATION_TYPE_JIRA, INTEGRATION_TYPE_SUMO_LOGIC,
    INTEGRATION_TYPE_MICROSOFT_TEAMS, INTEGRATION_TYPE_GOOGLE_CHRONICLE]

NOTIFICATION_TYPE_VULNERABILITY = "vulnerability"
NOTIFICATION_TYPE_COMPLIANCE = "compliance"
NOTIFICATION_TYPE_USER_ACTIVITY = "user_activity"
NOTIFICATION_TYPES = [NOTIFICATION_TYPE_VULNERABILITY, NOTIFICATION_TYPE_COMPLIANCE, NOTIFICATION_TYPE_USER_ACTIVITY]

TIME_UNIT_MAPPING = {
    "month": "M",
    "day": "d",
    "hour": "h",
    "minute": "m",
    "all": "all"
}

INTERVAL_MAPPING = {
    "15minutes": "30s",
    "30minutes": "1m",
    "1hour": "2m",
    "4hours": "10m",
    "12hours": "30m",
    "24hours": "1h",
    "7days": "10h",
    "30days": "1d",
    "60days": "2d",
    "90days": "3d",
    "6months": "6d",
    "1year": "1M"  # This is equivalent to (1M)
}

REGISTRY_TYPE_ECR = "ecr"
REGISTRY_TYPE_DOCKER_HUB = "docker_hub"
REGISTRY_TYPE_QUAY = "quay"
REGISTRY_TYPE_DOCKER_PVT = "docker_private_registry"
REGISTRY_TYPE_HARBOR = "harbor"
REGISTRY_TYPE_JFROG = "jfrog_container_registry"
REGISTRY_TYPE_GCLOUD = "google_container_registry"
REGISTRY_TYPE_AZURE = "azure_container_registry"
REGISTRY_TYPE_GITLAB = "gitlab"

ANALYZER_SERVER_URL = "https://{service}:4043/{action}"

SCOPE_NODE_DETAIL_API_URL = "http://deepfence-topology:8004/topology-api/topology/{topology_id}/{scope_id}"
SCOPE_HOST_API_CONTROL_URL = "http://deepfence-topology:8004/topology-api/control/{probe_id}/{host_name}%3B%3Chost%3E/{action}"
SCOPE_CONTAINER_API_CONTROL_URL = "http://deepfence-topology:8004/topology-api/control/{probe_id}/{container_id}%3B%3Ccontainer%3E/{action}"
SCOPE_IMAGE_API_CONTROL_URL = "http://deepfence-topology:8004/topology-api/control/{probe_id}/{image_full_name}%3B%3Ccontainer_image%3E/{action}"
SCOPE_POD_API_CONTROL_URL = "http://deepfence-topology:8004/topology-api/control/{probe_id}/{pod_id}/{action}"
SCOPE_KUBE_SERVICE_API_CONTROL_URL = "http://deepfence-topology:8004/topology-api/control/{probe_id}/{kube_service_id}/{action}"
SCOPE_KUBE_CONTROLLER_API_CONTROL_URL = "http://deepfence-topology:8004/topology-api/control/{probe_id}/{kube_controller_id}/{action}"

SECRET_SCAN_API_URL = "http://deepfence-secret-scanner:8011/secret-scan"
PACKAGE_SCANNER_REGISTRY_API_URL = "http://deepfence-package-scanner:8005/registry"

CUSTOMER_UNIQUE_ID = os.getenv('CUSTOMER_UNIQUE_ID', None)
CVE_INDEX = "cve"
CVE_SCAN_LOGS_INDEX = "cve-scan"
CLOUD_COMPLIANCE_SCAN = "cloud-compliance-scan"
SBOM_INDEX = "sbom-cve-scan"
SBOM_ARTIFACT_INDEX = "sbom-artifact"
SBOM_DEFAULT_FIELDS = ["name", "version", "licenses", "locations.path"]
SECRET_SCAN_INDEX = "secret-scan"
SECRET_SCAN_LOGS_INDEX = "secret-scan-logs"
REPORT_INDEX = "report"
COMPLIANCE_INDEX = "compliance"
COMPLIANCE_LOGS_INDEX = "compliance-scan-logs"
CLOUD_COMPLIANCE_INDEX = "cloud-compliance-scan"
CLOUD_COMPLIANCE_LOGS_INDEX = "cloud-compliance-scan-logs"
VULNERABILITY_LOG_PATH = "/var/log/vulnerability_scan_logs/"
CVE_ES_TYPE = CVE_INDEX
CVE_SCAN_LOGS_ES_TYPE = CVE_SCAN_LOGS_INDEX
SBOM_ES_TYPE = SBOM_INDEX
SBOM_ARTIFACT_ES_TYPE = SBOM_ARTIFACT_INDEX
SECRET_SCAN_ES_TYPE = SECRET_SCAN_INDEX
SECRET_SCAN_LOGS_ES_TYPE = SECRET_SCAN_LOGS_INDEX
REPORT_ES_TYPE = REPORT_INDEX
COMPLIANCE_ES_TYPE = COMPLIANCE_INDEX
COMPLIANCE_LOGS_ES_TYPE = COMPLIANCE_LOGS_INDEX
CLOUD_COMPLIANCE_ES_TYPE = CLOUD_COMPLIANCE_INDEX
CLOUD_COMPLIANCE_LOGS_ES_TYPE = CLOUD_COMPLIANCE_LOGS_INDEX

if CUSTOMER_UNIQUE_ID:
    CVE_INDEX += f"-{CUSTOMER_UNIQUE_ID}"
    CVE_SCAN_LOGS_INDEX += f"-{CUSTOMER_UNIQUE_ID}"
    SBOM_INDEX += f"-{CUSTOMER_UNIQUE_ID}"
    SBOM_ARTIFACT_INDEX += f"-{CUSTOMER_UNIQUE_ID}"
    SECRET_SCAN_INDEX += f"-{CUSTOMER_UNIQUE_ID}"
    SECRET_SCAN_LOGS_INDEX += f"-{CUSTOMER_UNIQUE_ID}"
    REPORT_INDEX += f"-{CUSTOMER_UNIQUE_ID}"
    COMPLIANCE_INDEX += f"-{CUSTOMER_UNIQUE_ID}"
    COMPLIANCE_LOGS_INDEX += f"-{CUSTOMER_UNIQUE_ID}"
    CLOUD_COMPLIANCE_INDEX += f"-{CUSTOMER_UNIQUE_ID}"
    CLOUD_COMPLIANCE_LOGS_INDEX += f"-{CUSTOMER_UNIQUE_ID}"

ALL_INDICES = [
    CVE_INDEX, CVE_SCAN_LOGS_INDEX, COMPLIANCE_INDEX, COMPLIANCE_LOGS_INDEX, CLOUD_COMPLIANCE_SCAN,
    CLOUD_COMPLIANCE_LOGS_INDEX
]
COMPLIANCE_PROVIDER_AWS = "aws"
COMPLIANCE_PROVIDER_GCP = "google_cloud"
COMPLIANCE_PROVIDER_AZURE = "azure"
COMPLIANCE_LINUX_HOST = "linux"
COMPLIANCE_KUBERNETES_HOST = "kubernetes"
COMPLIANCE_CHECK_TYPES = {
    COMPLIANCE_PROVIDER_AWS: ["cis", "aws-foundational-security", "nist", "pci", "hipaa", "soc2", "gdpr"],
    COMPLIANCE_PROVIDER_GCP: ["cis", "cft-scorecardd"],
    COMPLIANCE_PROVIDER_AZURE: ["cis", "nist", "hipaa"],
    COMPLIANCE_LINUX_HOST: ["hipaa", "gdpr", "pci", "nist"],
    COMPLIANCE_KUBERNETES_HOST: ["hipaa", "gdpr", "pci", "nist"]
}
CSPM_RESOURCES = {
    "aws_s3_bucket": "aws_s3",
    "aws_iam_user": "aws_iam",
    "aws_vpc": "aws_vpc",
    "aws_config_rule": "aws_config",
    "aws_cloudwatch_log_group": "aws_cloudwatch",
    "aws_ebs_volume": "aws_ebs",
    "aws_cloudtrail_trail": "aws_cloudtrail",
    "aws_kms_key": "aws_kms",
    "aws_dms_replication_instance": "aws_dms",
    "aws_acm_certificate": "aws_acm",
    "aws_elastic_beanstalk_environment": "aws_elastic_beanstalk",
    "aws_lambda_function": "aws_lambda",
    "aws_elasticsearch_domain": "aws_elasticsearch",
    "aws_ec2_application_load_balancer": "aws_elb",
    "aws_ec2_load_balancer_listener": "aws_elbv2",
    "aws_ssm_parameter": "aws_ssm",
    "aws_sagemaker_endpoint_configuration": "aws_sagemaker",
    "aws_cloudfront_distribution": "aws_cloudfront",
    "aws_secretsmanager_secret": "aws_secretsmanager",
    "aws_ec2_instance": "aws_ec2",
    "aws_ecr_repository": "aws_ecr",
    "aws_sqs_queue": "aws_sqs",
    "aws_redshift_cluster": "aws_redshift",
    "aws_efs_file_system": "aws_efs",
    "aws_emr_cluster": "aws_emr",
    "aws_api_gateway_stage": "aws_api_gateway",
    "aws_opensearch_domain": "aws_opensearch",
    "aws_guardduty_detector": "aws_guardduty",
    "aws_codebuild_project": "aws_codebuild",
    "aws_dynamodb_table": "aws_dynamodb",
    "aws_ecs_cluster": "aws_ecs",
    "aws_sns_topic": "aws_sns",
    "aws_ec2_autoscaling_group": "aws_autoscaling"
}
CSPM_RESOURCES_INVERTED = defaultdict(list)
for key, value in CSPM_RESOURCES.items():
    CSPM_RESOURCES_INVERTED[value].append(key)
CSPM_RESOURCE_LABELS = {
    "aws_s3": "AWS S3 Bucket",
    "aws_iam": "AWS Identity and Access Management (IAM)",
    "aws_vpc": "AWS VPC",
    "aws_config": "AWS Config",
    "aws_cloudwatch": "AWS Cloud Watch",
    "aws_ebs": "AWS Elastic Block Store",
    "aws_cloudtrail": "AWS CloudTrail",
    "aws_kms": "AWS Key Management Service",
    "aws_dms": "AWS Database Migration Service (DMS)",
    "aws_acm": "AWS ACM",
    "aws_elastic_beanstalk": "AWS Elastic Beanstalk",
    "aws_lambda": "AWS Lambda",
    "aws_elasticsearch": "AWS ElasticSearch",
    "aws_elb": "AWS ELB",
    "aws_elbv2": "AWS ELBv2",
    "aws_ssm": "AWS Systems Manager(SSM)",
    "aws_sagemaker": "AWS SageMaker",
    "aws_cloudfront": "AWS CloudFront",
    "aws_secretsmanager": "AWS Secrets Manager",
    "aws_ec2": "AWS EC2",
    "aws_ecr": "AWS ECR",
    "aws_sqs": "AWS SQS",
    "aws_redshift": "AWS Redshift",
    "aws_efs": "AWS EFS",
    "aws_emr": "AWS EMR",
    "aws_api_gateway": "AWS API Gateway",
    "aws_opensearch": "AWS OpenSearch Service",
    "aws_guardduty": "AWS GuardDuty",
    "aws_codebuild": "AWS CodeBuild",
    "aws_dynamodb": "Amazon DynamoDB",
    "aws_ecs": "Amazon ECS",
    "aws_sns": "AWS SNS",
    "aws_autoscaling": "AWS Autoscaling"
}
CVE_SCAN_TYPES = ["base", "java", "python", "ruby", "php", "javascript", "rust", "golang", "dotnet"]
AES_SETTING_KEY = "aes_secret"
CLOUD_CREDENTIAL_AES_SETTING_KEY = "cloud_credential_secret"

PDF_REPORT_MAX_DOCS = 75000
REGISTRY_IMAGES_CACHE_KEY_PREFIX = 'REGISTRY_IMAGES_LIST'
REGISTRY_IMAGES_CACHE_EXPIRY_TIME = datetime.timedelta(days=2)

SECRET_SCANNER_FILE_PREFIX = '/tmp/Deepfence/SecretScanning'
CLOUD_RESOURCES_CACHE_KEY = "CLOUD_RESOURCES_LIST"
ATTACK_GRAPH_CACHE_KEY = "ATTACK_GRAPH"
ATTACK_GRAPH_NODE_DETAIL_KEY = "ATTACK_GRAPH_NODE_DETAIL"
CLOUD_COMPLIANCE_SCAN_NODES_CACHE_KEY = "CLOUD_COMPLIANCE_NODES_LIST"
PENDING_CLOUD_COMPLIANCE_SCANS_KEY = "PENDING_CLOUD_COMPLIANCE_SCANS_KEY"

DURATION_IN_MINS = [
    (-1, 'immediate'),
    (5, 'five minutes'),
    (15, 'fifteen minutes'),
    (30, 'thirty minutes'),
    (60, 'sixty minutes')
]

ES_MAX_CLAUSE = 1024
ES_TERMS_AGGR_SIZE = 50000
# We know companies having 10k containers, so setting it to even higher number.
# Even if UI is not used at that scale, API needs correct data.

API_URL_PREFIX = "/deepfence/v1.5"
SCOPE_BASE_URL = "http://deepfence-topology:8004"
SCOPE_BASE_URL_WS = "ws://deepfence-topology:8004"
NODE_TYPE_CLOUD_PROVIDER = "cloud_provider"
NODE_TYPE_CLOUD_REGION = "cloud_region"
NODE_TYPE_INFRA = "infra_wide"
NODE_TYPE_HOST = "host"
NODE_TYPE_CONTAINER = "container"
NODE_TYPE_PROCESS = "process"
NODE_TYPE_CONTAINER_IMAGE = "container_image"
NODE_TYPE_REGISTRY_IMAGE = "registry_image"
NODE_TYPE_CONTAINER_BY_NAME = "container_by_name"
NODE_TYPE_PROCESS_BY_NAME = "process_by_name"
NODE_TYPE_POD = "pod"
NODE_TYPE_KUBE_CONTROLLER = "kube_controller"
NODE_TYPE_KUBE_CLUSTER = "kube_cluster"
NODE_TYPE_KUBE_NAMESPACE = "kube_namespace"
NODE_TYPE_KUBE_SERVICE = "kube_service"
NODE_TYPE_SWARM_SERVICE = "swarm_service"
NODE_TYPE_LINUX = 'linux'
USER_DEFINED_TAGS = "user_defined_tags"
CLOUD_AWS = "aws"
CLOUD_GCP = "google_cloud"
CLOUD_AZURE = "azure"
NODE_TYPE_LABEL = {
    NODE_TYPE_HOST: "Compute Instance",
    NODE_TYPE_CONTAINER: "Container",
    NODE_TYPE_CONTAINER_IMAGE: "Container Image",
    NODE_TYPE_POD: "Pod",
    NODE_TYPE_KUBE_NAMESPACE: "K8s Namespace",
    NODE_TYPE_KUBE_CLUSTER: "K8s Cluster",
    NODE_TYPE_CLOUD_PROVIDER: "Cloud Provider",
    NODE_TYPE_CLOUD_REGION: "Cloud Region",
    NODE_TYPE_PROCESS: "Process",
    NODE_TYPE_KUBE_SERVICE: "K8s Service",
}
NODE_TYPES = [NODE_TYPE_HOST, NODE_TYPE_CONTAINER, NODE_TYPE_PROCESS, NODE_TYPE_CONTAINER_IMAGE, NODE_TYPE_KUBE_SERVICE,
              NODE_TYPE_CONTAINER_BY_NAME, NODE_TYPE_PROCESS_BY_NAME, NODE_TYPE_POD, NODE_TYPE_KUBE_CONTROLLER,
              NODE_TYPE_SWARM_SERVICE]
NODE_TYPES_ALL = [NODE_TYPE_HOST, NODE_TYPE_CONTAINER, NODE_TYPE_PROCESS, NODE_TYPE_CONTAINER_IMAGE,
                  NODE_TYPE_KUBE_SERVICE, NODE_TYPE_CONTAINER_BY_NAME, NODE_TYPE_PROCESS_BY_NAME, NODE_TYPE_POD,
                  NODE_TYPE_KUBE_CONTROLLER, NODE_TYPE_SWARM_SERVICE, NODE_TYPE_REGISTRY_IMAGE, CLOUD_AWS, CLOUD_GCP,
                  CLOUD_AZURE, COMPLIANCE_LINUX_HOST, COMPLIANCE_KUBERNETES_HOST]
NODE_ACTION_COMPLIANCE_APPLICABLE_SCANS = "applicable_compliance_scans"
NODE_ACTION_COMPLIANCE_START_SCAN = "start_compliance_scan"
NODE_ATTACK_PATH = "attack_path"
NODE_ACTION_CVE_SCAN_START = "cve_scan_start"
NODE_ACTION_CVE_SCAN_STOP = "cve_scan_stop"
NODE_ACTION_CVE_SCAN_STATUS = "cve_scan_status"
NODE_ACTION_SECRET_SCAN_START = "secret_scan_start"
NODE_ACTION_SCHEDULE_SECRET_SCAN = "schedule_secret_scan"
NODE_ACTION_PAUSE_CONTAINER = "pause_container"
NODE_ACTION_UNPAUSE_CONTAINER = "unpause_container"
NODE_ACTION_RESTART_CONTAINER = "restart_container"
NODE_ACTION_START_CONTAINER = "start_container"
NODE_ACTION_STOP_CONTAINER = "stop_container"
NODE_ACTION_PAUSE = "pause"
NODE_ACTION_UNPAUSE = "unpause"
NODE_ACTION_RESTART = "restart"
NODE_ACTION_START = "start"
NODE_ACTION_STOP = "stop"
NODE_ACTION_LIST_IMAGES = "list_container_images"
NODE_ACTION_ADD_TAGS = "add_tags"
NODE_ACTION_DELETE_TAGS = "delete_tags"
NODE_ACTION_SCALE_UP = "kubernetes_scale_up"
NODE_ACTION_SCALE_DOWN = "kubernetes_scale_down"
NODE_ACTION_SCHEDULE_CVE_SCAN = "schedule_vulnerability_scan"
NODE_ACTION_SCHEDULE_COMPLIANCE_SCAN = "schedule_compliance_scan"
NODE_ACTION_DOWNLOAD_REPORT = "download_report"
NODE_ACTION_SCHEDULE_SEND_REPORT = "schedule_send_report"
NODE_BULK_ACTIONS = {
    NODE_TYPE_HOST: [
        NODE_ACTION_COMPLIANCE_START_SCAN, NODE_ACTION_CVE_SCAN_START,
        NODE_ACTION_DOWNLOAD_REPORT, NODE_ACTION_SCHEDULE_SEND_REPORT, NODE_ACTION_SCHEDULE_CVE_SCAN,
        NODE_ACTION_SCHEDULE_COMPLIANCE_SCAN, NODE_ACTION_CVE_SCAN_STOP, NODE_ACTION_SECRET_SCAN_START],
    NODE_TYPE_REGISTRY_IMAGE: [NODE_ACTION_CVE_SCAN_START, NODE_ACTION_SCHEDULE_CVE_SCAN, NODE_ACTION_CVE_SCAN_STOP],
    NODE_TYPE_CONTAINER: [
        NODE_ACTION_COMPLIANCE_START_SCAN, NODE_ACTION_CVE_SCAN_START, NODE_ACTION_DOWNLOAD_REPORT,
        NODE_ACTION_SCHEDULE_SEND_REPORT, NODE_ACTION_SCHEDULE_CVE_SCAN, NODE_ACTION_SCHEDULE_COMPLIANCE_SCAN,
        NODE_ACTION_CVE_SCAN_STOP, NODE_ACTION_SECRET_SCAN_START],
    NODE_TYPE_CONTAINER_IMAGE: [
        NODE_ACTION_COMPLIANCE_START_SCAN, NODE_ACTION_CVE_SCAN_START, NODE_ACTION_DOWNLOAD_REPORT,
        NODE_ACTION_SCHEDULE_SEND_REPORT, NODE_ACTION_SCHEDULE_CVE_SCAN, NODE_ACTION_SCHEDULE_COMPLIANCE_SCAN,
        NODE_ACTION_CVE_SCAN_STOP, NODE_ACTION_SECRET_SCAN_START],
    NODE_TYPE_POD: [NODE_ACTION_DOWNLOAD_REPORT, NODE_ACTION_SCHEDULE_SEND_REPORT],
    COMPLIANCE_PROVIDER_AZURE: [NODE_ACTION_SCHEDULE_COMPLIANCE_SCAN],
    COMPLIANCE_PROVIDER_GCP: [NODE_ACTION_SCHEDULE_COMPLIANCE_SCAN],
    COMPLIANCE_KUBERNETES_HOST: [NODE_ACTION_DOWNLOAD_REPORT],
    NODE_TYPE_LINUX: [NODE_ACTION_DOWNLOAD_REPORT, NODE_ACTION_SCHEDULE_COMPLIANCE_SCAN],
    COMPLIANCE_PROVIDER_AWS: [NODE_ACTION_DOWNLOAD_REPORT, NODE_ACTION_SCHEDULE_COMPLIANCE_SCAN],
    CLOUD_AWS: [NODE_ACTION_DOWNLOAD_REPORT]
}

CVE_SCAN_STATUS_STARTED = "STARTED"
CVE_SCAN_STATUS_IN_PROGRESS = "SCAN_IN_PROGRESS"
CVE_SCAN_STATUS_WARN = "WARN"
CVE_SCAN_STATUS_COMPLETED = "COMPLETED"
CVE_SCAN_STATUS_ERROR = "ERROR"
CVE_SCAN_STATUS_STOPPED = "STOPPED"
CVE_SCAN_STATUS_GENERATING_SBOM = "GENERATING_SBOM"
CVE_SCAN_STATUS_GENERATED_SBOM = "GENERATED_SBOM"
CVE_SCAN_STATUS_QUEUED = "QUEUED"
CVE_SCAN_RUNNING_STATUS = [CVE_SCAN_STATUS_STARTED, CVE_SCAN_STATUS_IN_PROGRESS, CVE_SCAN_STATUS_WARN,
                           CVE_SCAN_STATUS_GENERATING_SBOM, CVE_SCAN_STATUS_GENERATED_SBOM]
CVE_SCAN_NOT_RUNNING_STATUS = [CVE_SCAN_STATUS_COMPLETED, CVE_SCAN_STATUS_ERROR, CVE_SCAN_STATUS_STOPPED]

SECRET_SCAN_STATUS_COMPLETED = "COMPLETE"
SECRET_SCAN_STATUS_IN_PROGRESS = "IN_PROGRESS"

TOPOLOGY_ID_CONTAINER = "containers"
TOPOLOGY_ID_CONTAINER_IMAGE = "containers-by-image"
TOPOLOGY_ID_CONTAINER_BY_NAME = "containers-by-hostname"
TOPOLOGY_ID_PROCESS = "processes"
TOPOLOGY_ID_PROCESS_BY_NAME = "processes-by-name"
TOPOLOGY_ID_HOST = "hosts"
TOPOLOGY_ID_POD = "pods"
TOPOLOGY_ID_KUBE_CONTROLLER = "kube-controllers"
TOPOLOGY_ID_KUBE_SERVICE = "services"
TOPOLOGY_ID_SWARM_SERVICE = "swarm-services"

TOPOLOGY_ID_NODE_TYPE_MAP = {
    TOPOLOGY_ID_CONTAINER: NODE_TYPE_CONTAINER,
    TOPOLOGY_ID_CONTAINER_IMAGE: NODE_TYPE_CONTAINER_IMAGE,
    TOPOLOGY_ID_CONTAINER_BY_NAME: NODE_TYPE_CONTAINER_BY_NAME,
    TOPOLOGY_ID_PROCESS: NODE_TYPE_PROCESS,
    TOPOLOGY_ID_PROCESS_BY_NAME: NODE_TYPE_PROCESS_BY_NAME,
    TOPOLOGY_ID_HOST: NODE_TYPE_HOST,
    TOPOLOGY_ID_POD: NODE_TYPE_POD,
    TOPOLOGY_ID_KUBE_CONTROLLER: NODE_TYPE_KUBE_CONTROLLER,
    TOPOLOGY_ID_KUBE_SERVICE: NODE_TYPE_KUBE_SERVICE,
    TOPOLOGY_ID_SWARM_SERVICE: NODE_TYPE_SWARM_SERVICE
}

TOPOLOGY_ID_NODE_TYPE_MAP_REVERSE = {v: k for k, v in TOPOLOGY_ID_NODE_TYPE_MAP.items()}

SCOPE_TOPOLOGY_COUNT = "TOPOLOGY_COUNT"
SCOPE_TOPOLOGY_COUNT_PREFIX = "TOPOLOGY_COUNT_"
TOPOLOGY_FILTERS_PREFIX = "TOPOLOGY_FILTERS_"
DF_ID_TO_SCOPE_ID_REDIS_KEY_PREFIX = "DF_ID_TO_SCOPE_ID_"
TOPOLOGY_HOSTS_PROBE_MAP_REDIS_KEY = "TOPOLOGY_HOSTS_PROBE_MAP"
TOPOLOGY_USER_HOST_COUNT_MAP_REDIS_KEY = "TOPOLOGY_USER_HOST_COUNT_MAP"

EMPTY_POD_SCOPE_ID = "0;<pod>"
REDIS_COMPLIANCE_APPLICABLE_SCANS_PREFIX = "compliance_applicable_scans"
REDIS_KEY_PREFIX_CLUSTER_AGENT_PROBE_ID = "CLUSTER_AGENT_PROBE_ID_"

DEEPFENCE_DIAGNOSIS_SERVICE_URL = "http://deepfence-diagnosis:8009"
DEEPFENCE_DIAGNOSIS_LOGS_URL = "{}/diagnosis/logs".format(DEEPFENCE_DIAGNOSIS_SERVICE_URL)
DEEPFENCE_CONTAINER_STATE_URL = "{}/diagnosis/container_state".format(DEEPFENCE_DIAGNOSIS_SERVICE_URL)
DEEPFENCE_CONSOLE_CPU_MEMORY_STATE_URL = "{}/diagnosis/cpu_memory_stats".format(DEEPFENCE_DIAGNOSIS_SERVICE_URL)

FILTER_TYPE_KUBE_NAMESPACE = "kubernetes_namespace"
FILTER_TYPE_KUBE_CLUSTER_NAME = "kubernetes_cluster_name"
FILTER_TYPE_HOST_NAME = "host_name"
FILTER_TYPE_IMAGE_NAME = "image_name"
FILTER_TYPE_IMAGE_NAME_WITH_TAG = "image_name_with_tag"
FILTER_TYPE_TAGS = "user_defined_tags"
INTEGRATION_FILTER_TYPES = [FILTER_TYPE_KUBE_NAMESPACE, FILTER_TYPE_KUBE_CLUSTER_NAME, FILTER_TYPE_HOST_NAME,
                            FILTER_TYPE_IMAGE_NAME, FILTER_TYPE_TAGS, FILTER_TYPE_IMAGE_NAME_WITH_TAG]
DEEPFENCE_KEY = "deepfence-key"

# all text fields needs .keyword in es query for sorting
# append array as new fields is added
TABLE_COLUMN_NON_TEXT_FIELD = [
    "count", "@timestamp"
]

# user activity related consts
EVENT_COMPLIANCE_SCAN = "compliance_scan"
EVENT_VULNERABILITY_SCAN = "vulnerability_scan"
EVENT_SECRET_SCAN = "secret_scan"
EVENT_INTEGRATION = "integration"
EVENT_AUTH_LOGIN = "auth"
ACTION_START = "start"
ACTION_STOP = "stop"
ACTION_LOGOUT = "logout"
ACTION_LOGIN = "login"
ACTION_INTERRUPT = "interupt"
ACTION_CREATE = "create"
ACTION_DELETE = "delete"
ACTION_ENABLE = "enable"
ACTION_DISABLE = "disable"
ACTION_BULK = "bulk"

CLOUD_VM = "host"
CLOUD_OBJECT_STORAGE = "bucket"
CLOUD_LB = "load_balancer"
CLOUD_DB = "database"
CLOUD_USER = "user"
CLOUD_SERVERLESS = "serverless_instance"

CLOUD_RESOURCES = {
    CLOUD_VM: {
        CLOUD_AWS: ["aws.ec2"],
        CLOUD_GCP: ["gcp.instance"],
        CLOUD_AZURE: ["azure.vm"]
    },
    CLOUD_OBJECT_STORAGE: {
        CLOUD_AWS: ["aws.s3"],
        CLOUD_GCP: ["gcp.bucket"],
        CLOUD_AZURE: ["azure.storage"]
    },
    CLOUD_LB: {
        CLOUD_AWS: ["aws.elb"],
        CLOUD_GCP: ["gcp.loadbalancer-target-instance"],
        CLOUD_AZURE: ["azure.loadbalancer"]
    }
}

STEAMPIPE_TABLES = {
    CLOUD_VM: {
        CLOUD_AWS: ["ec2_instance"],
        CLOUD_GCP: ["compute_instance"],
        CLOUD_AZURE: ["compute_virtual_machine"]
    },
    CLOUD_OBJECT_STORAGE: {
        CLOUD_AWS: ["s3_bucket"],
        CLOUD_GCP: ["storage_bucket"],
        CLOUD_AZURE: ["storage_blob_service"]
    },
    CLOUD_LB: {
        CLOUD_AWS: ["ec2_application_load_balancer", "ec2_network_load_balancer", "ec2_gateway_load_balancer",
                    "ec2_classic_load_balancer"],
        CLOUD_GCP: [""],
        CLOUD_AZURE: ["lb"]
    },
    CLOUD_DB: {
        CLOUD_AWS: ["dynamodb_table", "elasticache_cluster", "elasticsearch_domain", "rds_db_cluster"],
        CLOUD_GCP: ["sql_database_instance"],
        CLOUD_AZURE: ["cosmosdb_account", "postgresql_server", "redis_cache", "sql_server"]
    },
    CLOUD_USER: {
        CLOUD_AWS: ["iam_user"],
        CLOUD_GCP: ["iam_policy"],
        CLOUD_AZURE: ["ad_user"]
    },
    CLOUD_SERVERLESS: {
        CLOUD_AWS: ["lambda_function", "ecs_service", "ecs_task"],
        CLOUD_GCP: ["cloudfunctions_function"],
        CLOUD_AZURE: ["kubernetes_cluster", "app_service_function_app"]
    }
}

# sensitive info keys constants add here
API_TOKEN = "api_token"
AUTH_HEADER = "auth_header"
AUTHORIZATION_KEY = "authorization_key"
AWS_ACCESS_KEY = "aws_access_key"
AWS_SECRET_KEY = "aws_secret_key"
PASSWORD = "password"
SERVICE_KEY = "service_key"
TOKEN = "token"

SENSITIVE_KEYS = [API_TOKEN, AUTH_HEADER, AUTHORIZATION_KEY, AWS_ACCESS_KEY, AWS_SECRET_KEY, PASSWORD, SERVICE_KEY,
                  TOKEN]
REDACT_STRING = "*"
