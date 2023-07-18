---
title: AWS Fargate
---

# AWS Fargate

On AWS Fargate, the ThreatMapper sensor agents are deployed as a sidecar container, using a task definition. 

:::danger

These instructions are draft, untested, and need technical review.

See also the Deepfence ThreatStryker instructions.

:::

## Before you Begin

Grant IAM permissions for ECS task execution role to access this secret as outlined [here](https://aws.amazon.com/blogs/compute/introducing-private-registry-authentication-support-for-aws-fargate/).

  * Create an AWS secret that contains the user credentials needed to pull the Deepfence sensor container image from a private repository.  Once the secret is created, it can be linked to an IAM policy and added to an IAM role. You can also create secrets and policies for any other container images that are hosted in private repositories and need to be deployed as part of the Fargate task definition.(**Only required if using private registry to pull container images**)
  * Create one or more IAM roles that contain the ```AmazonECSTaskExecutionRolePolicy``` policy, along with the policy that references the AWS secrets.

## Create New Task Definition

1. Select EC2 launch type: **Fargate**

2. Configure the task definition:

   * Name - provide an appropriate name
   * Task Role - select an IAM role that contains the ```AmazonECSTaskExecutionRolePolicy```
   * Task Execution Role - select the IAM role that contains the policy that references the correct AWS secrets to access the private repositories.  This can be the same IAM role as specified in the Task Role if the role contains the AmazonECSTaskExecutionRolePolicy and the policies referencing the AWS secrets.
   * CPU and Memory - 0.5 vCPU, 1.0 Gb is appropriate
   * Define the sidecar containers - 
      * Name - deepfence-agent
      * Image - ```docker.io/deepfenceio/deepfence_fargate_agent_ce:1.5.0```
      * Select the checkbox for "Private registry authentication" and provide the Secrets Manager ARN or name(**Only required if using private registry to pull container images**)
      * Unselect the checkbox for "Essential" - the sidecar container is transient and exits once the sensor is installed
   * Define your application containers
   * Entry Point -
      * Define the entry point shell script that invokes the Deepfence sensor: /deepfence/usr/local/bin/deepfence-entry-point-scratch.sh
      * Set the command to the entry point as specified by the application container: /entry-point.sh
   * Set the environment variables that configure the Deepfence sensor:
      * ```DF_BACKEND_IP```: IP address of management console
      * ```DF_FIM_ON```: 
      * ```DF_SERVERLESS```:
   * Mount the volume from the Deepfence sidecar container by specifying the sidecar container name: deepfence-agent

You can optionally add the ```SYS_PTRACE``` capability to the Linux Parameters through the JSON view as this cannot be added through the UI wizard.  Adding this capability will allow the Deepfence sensor to get memory dumps of the processes started by the default user.

## Deploy the Task

Once you've created the task definition, you can go ahead and launch it.  The Deepfence sensor deployed as a sidecar container will automatically register itself with the Deepfence console.


