---
title: Circle CI
---

# CircleCI

## Deploy to AWS ECS from ECR via CircleCI 2.0

This is an example of how to build and test a Dockerized web application on [CircleCI](https://circleci.com), push the Docker image to an Amazon Elastic Container Registry (ECR).

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

## Sample Circle CI YAML

```
version: 2
jobs:
  build:
    docker:
      - image: circleci/golang:1.8
    steps:
      - checkout
      - setup_remote_docker
      - run:
          name: Make the executable
          command: |
            go build -o demo-app src/main.go
      - run:
          name: Setup common environment variables
          command: |
            echo 'export ECR_REPOSITORY_NAME="${AWS_RESOURCE_NAME_PREFIX}"' >> $BASH_ENV
            echo 'export FULL_IMAGE_NAME="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}:${CIRCLE_SHA1}"' >> $BASH_ENV
      - run:
          name: Build image
          command: |
            docker build -t $FULL_IMAGE_NAME .
      - run:
          name: Run Deepfence Vulnerability Scan
          command: |
            docker run -it --rm --net=host -v /var/run/docker.sock:/var/run/docker.sock deepfenceio/deepfence_package_scanner_ce:1.5.0 -mgmt-console-url=$DEEPFENCE_CONSOLE_URL -deepfence-key="$DEEPFENCE_KEY" -vulnerability-scan=true -output=table -mode=local -source="$FULL_IMAGE_NAME" -fail-on-count=$FAIL_CVE_COUNT -fail-on-critical-count=$FAIL_CRITICAL_CVE_COUNT -fail-on-high-count=$FAIL_HIGH_CVE_COUNT -fail-on-medium-count=$FAIL_MEDIUM_CVE_COUNT -fail-on-low-count=$FAIL_LOW_CVE_COUNT -fail-on-score=$FAIL_CVE_SCORE -scan-type=base,java,python,ruby,php,nodejs,js,dotnet
      - run:
          name: Test image
          command: |
            docker run -d -p 8080:8080 --name built-image $FULL_IMAGE_NAME
            sleep 10
            docker run --network container:built-image appropriate/curl --retry 10 --retry-connrefused http://localhost:8080 | grep "Hello World!"
      - run:
          name: Save image to an archive
          command: |
            mkdir docker-image
            docker save -o docker-image/image.tar $FULL_IMAGE_NAME
      - persist_to_workspace:
          root: .
          paths:
            - docker-image
  deploy:
    docker:
      - image: circleci/python:3.6.1
    environment:
      AWS_DEFAULT_OUTPUT: json
    steps:
      - checkout
      - setup_remote_docker
      - attach_workspace:
          at: workspace
      - restore_cache:
          key: v1-{{ checksum "requirements.txt" }}
      - run:
          name: Install awscli
          command: |
            python3 -m venv venv
            . venv/bin/activate
            pip install -r requirements.txt
      - save_cache:
          key: v1-{{ checksum "requirements.txt" }}
          paths:
            - "venv"
      - run:
          name: Load image
          command: |
            docker load --input workspace/docker-image/image.tar
      - run:
          name: Setup common environment variables
          command: |
            echo 'export ECR_REPOSITORY_NAME="${AWS_RESOURCE_NAME_PREFIX}"' >> $BASH_ENV
      - run:
          name: Push image
          command: |
            . venv/bin/activate
            eval $(aws ecr get-login --region $AWS_DEFAULT_REGION --no-include-email)
            docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$ECR_REPOSITORY_NAME:$CIRCLE_SHA1
workflows:
  version: 2
  build-deploy:
    jobs:
      - build
      - deploy:
          requires:
            - build
```

## References
- https://github.com/circleci/go-ecs-ecr
- https://github.com/awslabs/aws-cloudformation-templates
- https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_GetStarted.html