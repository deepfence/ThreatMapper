---
title: Amazon ECS (EC2 Provider)
---

# Amazon ECS (EC2 Provider)

*Deployed as a daemon service using a task definition*

In Amazon ECS, the ThreatStryker sensors are deployed as a daemon service using task definition.


# Installing on Amazon ECS (EC2 Provider)

1. Set up Amazon ECS by following the steps outlined here: [Set up to use Amazon ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/get-set-up-for-amazon-ecs.html)

2. Add the Deepfence Quay secrets provided to AWS secrets manager by following the steps outlined here: [Private registry authentication for tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/private-auth.html)

3. Give IAM permissions for ECS task execution role to access this secret as outlined here: [IAM roles for tasks](https://docs.aws.amazon.com/AmazonECS/latest/userguide/task-iam-roles.html)

4. Create new task definition for deepfence agent

Change the url `<deepfence.customer.com>` to the url / ip address of Deepfence Management Console.
In `DEEPFENCE_KEY` field, replace `<DEEPFENCE_KEY>` with your [API Key](../console/initial-configuration).

```json
{
  "taskDefinitionArn": "arn:aws:ecs:us-east-1:123456789012:task-definition/deepfence-agent-ec2-provider:1",
  "containerDefinitions": [
    {
      "name": "deepfence-agent",
      "image": "docker.io/deepfenceio/deepfence_agent_ce:1.4.0",
      "cpu": 0,
      "links": [],
      "portMappings": [],
      "essential": true,
      "entryPoint": [],
      "command": [],
      "environment": [
        {
          "name": "DEEPFENCE_KEY",
          "value": "<DEEPFENCE_KEY>"
        },
        {
          "name": "MGMT_CONSOLE_URL",
          "value": "<deepfence.customer.com>"
        },
        {
          "name": "USER_DEFINED_TAGS",
          "value": ""
        }
      ],
      "environmentFiles": [],
      "mountPoints": [
        {
          "sourceVolume": "Host",
          "containerPath": "/fenced/mnt/host",
          "readOnly": true
        },
        {
          "sourceVolume": "SysKernelDebug",
          "containerPath": "/sys/kernel/debug",
          "readOnly": false
        },
        {
          "sourceVolume": "DockerSock",
          "containerPath": "/var/run/docker.sock",
          "readOnly": false
        },
        {
          "sourceVolume": "VarLogFenced",
          "containerPath": "/var/log/fenced",
          "readOnly": false
        }
      ],
      "volumesFrom": [],
      "secrets": [],
      "dnsServers": [],
      "dnsSearchDomains": [],
      "extraHosts": [],
      "dockerSecurityOptions": [],
      "dockerLabels": {},
      "ulimits": [],
      "systemControls": []
    }
  ],
  "family": "deepfence-agent-ec2-provider",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "networkMode": "bridge",
  "revision": 1,
  "volumes": [
    {
      "name": "SysKernelDebug",
      "host": {
        "sourcePath": "/sys/kernel/debug"
      }
    },
    {
      "name": "DockerSock",
      "host": {
        "sourcePath": "/var/run/docker.sock"
      }
    },
    {
      "name": "VarLogFenced",
      "host": {}
    },
    {
      "name": "Host",
      "host": {
        "sourcePath": "/"
      }
    }
  ],
  "status": "ACTIVE",
  "requiresAttributes": [
    {
      "name": "com.amazonaws.ecs.capability.docker-remote-api.1.17"
    },
    {
      "name": "com.amazonaws.ecs.capability.task-iam-role"
    },
    {
      "name": "ecs.capability.secrets.ssm.environment-variables"
    },
    {
      "name": "com.amazonaws.ecs.capability.docker-remote-api.1.18"
    }
  ],
  "placementConstraints": [],
  "compatibilities": [
    "EXTERNAL",
    "EC2"
  ],
  "requiresCompatibilities": [
    "EC2"
  ],
  "cpu": "512",
  "memory": "2048",
  "runtimePlatform": {
    "cpuArchitecture": "X86_64",
    "operatingSystemFamily": "LINUX"
  },
  "registeredAt": "2022-08-25T18:54:26.311Z",
  "registeredBy": "arn:aws:iam::123456789012:user/ramanan",
  "tags": [
    {
      "key": "ecs:taskDefinition:createdFrom",
      "value": "ecs-console-v2"
    },
    {
      "key": "ecs:taskDefinition:stackId",
      "value": "arn:aws:cloudformation:us-east-1:123456789012:stack/ECS-Console-V2-TaskDefinition-963c59cc-3250-4788-b15d-84f17dad97a5/53cdad80-24a7-11ed-bf9c-0e400f5becdb"
    }
  ]
}
```

5. Create a new `service` and choose `EC2 provider / EC2 launch type`
6. Set `Desired tasks` as the number of ec2 instances in the ECS cluster
7. Choose `One task per host` task placement and create the task
