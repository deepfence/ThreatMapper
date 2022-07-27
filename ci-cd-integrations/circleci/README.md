# CircleCI Demo: AWS ECS ECR [![CircleCI status](https://circleci.com/gh/CircleCI-Public/circleci-demo-aws-ecs-ecr.svg "CircleCI status")](https://circleci.com/gh/CircleCI-Public/circleci-demo-aws-ecs-ecr)

## Deploy to AWS ECS from ECR via CircleCI 2.0 (Example Project)
This project is an update of the https://github.com/circleci/go-ecs-ecr project to
deploy to AWS ECS from ECR on CircleCI 2.0.
This project builds and deploys a "Hello World" Go webapp. It provides an example of how to build and test a Dockerized 
web application on [CircleCI](https://circleci.com), push the Docker image to an Amazon Elastic Container Registry (ECR).

## Alternative branches
* [Using Orbs](https://github.com/CircleCI-Public/circleci-demo-aws-ecs-ecr/tree/orbs)
* [Simplified Orb Demo](https://github.com/CircleCI-Public/circleci-demo-aws-ecs-ecr/tree/simple_orb_demo)

### Configure environment variables on CircleCI
The following [environment variables](https://circleci.com/docs/2.0/env-vars/#setting-an-environment-variable-in-a-project) must be set for the project on CircleCI via the project settings page, before the project can be built successfully.


| Variable                   | Description                                                                                                                                                                                                                  |
|----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `AWS_ACCESS_KEY_ID`        | Used by the AWS CLI                                                                                                                                                                                                          |
| `AWS_SECRET_ACCESS_KEY`    | Used by the AWS CLI                                                                                                                                                                                                          |
| `AWS_DEFAULT_REGION`       | Used by the AWS CLI. Example value: "us-east-1" (Please make sure the specified region is supported by the Fargate launch type)                                                                                              |
| `AWS_ACCOUNT_ID`           | AWS account id. This information is required for deployment.                                                                                                                                                                 |
| `AWS_RESOURCE_NAME_PREFIX` | Prefix that some of the required AWS resources are assumed to have in their names. The value should correspond to the AWS ECR repository name or `aws_resource_prefix` variable value in `terraform_setup/terraform.tfvars`. |
| `DEEPFENCE_CONSOLE_URL`    | Deepfence management console url                                                                                                                                                                                             |
| `FAIL_CVE_COUNT`           | Fail the build if number of vulnerabilities found >= this value. Set -1 to pass regardless of vulnerabilities.                                                                                                               |
| `FAIL_CRITICAL_CVE_COUNT`  | Fail the build if number of critical vulnerabilities found >= this value. Set -1 to pass regardless of critical vulnerabilities.                                                                                             |
| `FAIL_HIGH_CVE_COUNT`      | Fail the build if number of high vulnerabilities found >= this value. Set -1 to pass regardless of high vulnerabilities.                                                                                                     |
| `FAIL_MEDIUM_CVE_COUNT`    | Fail the build if number of medium vulnerabilities found >= this value. Set -1 to pass regardless of medium vulnerabilities.                                                                                                 |
| `FAIL_LOW_CVE_COUNT`       | Fail the build if number of low vulnerabilities found >= this value. Set -1 to pass regardless of low vulnerabilities.                                                                                                       |
| `FAIL_CVE_SCORE`           | Fail the build if cumulative CVE score is >= this value. Set -1 to pass regardless of cve score.                                                                                                                             |

## References
- https://github.com/circleci/go-ecs-ecr
- https://github.com/awslabs/aws-cloudformation-templates
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_GetStarted.html
