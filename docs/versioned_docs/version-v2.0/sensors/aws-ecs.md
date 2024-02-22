---
title: AWS ECS (EC2 Provider)
---

# AWS ECS (EC2 Provider)

*Deployed as a daemon service using a task definition*

In AWS ECS, the ThreatMapper sensors are deployed as a daemon service using task definition.

# Prerequisites

Make sure you have the following information:
- Management console URL/IP, later referred as `<MGMT_CONSOLE_URL>`
- Deepfence API key, later referred as `<DEEPFENCE_KEY>` (This key can be found from the management console, in the settings > User > API Key)

# Installing on AWS ECS (EC2 Provider)

1. Create a new role (e.g.: `deepfence-agent-role`)
- Go to the IAM dashboard from AWS Console
- Go to Access management > roles
- Select "Create Role",
- Select "Custom trust policy"
- Paste the following:

```json
{
    "Version": "2012-10-17",
    "Statement": [
    {
        "Effect": "Allow",
        "Principal": {
            "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
    }
    ]
}
```

Then continue:

- Search in the "Permissions policies" for "Task" > Select the following policy: `AmazonECSTaskExecutionRolePolicy`
- Click "Next", name the role `deepfence-agent-role`, then "Create role"
- Search for your newly created roles

Then create the new policy.

3. Create new task definition for deepfence agent
- Use Old ECS Experience (old UI)
- Go to the "Elastic Container Service" dashboard from AWS console
- In the top left corner, disable new UI to use the legacy UI.
- Go to "Task Definitions"
- Select "Create new Task Definition"
- Select EC2, then "Next step"
- Provide a name to your task definition (e.g. `deepfence-agent-ec2-task`)
- Select the Task role and execution role (e.g. `deepfence-agent-role`)
- At the bottom, select "Configure via JSON"
- Copy and paste the following JSON configuration: (Replace `<DEEPFENCE_KEY>` and `<MGMT_CONSOLE_URL>` with actual values)

```json
{
  "ipcMode": null,
  "containerDefinitions": [
    {
      "dnsSearchDomains": [],
      "environmentFiles": null,
      "logConfiguration": null,
      "entryPoint": [],
      "portMappings": [],
      "command": [],
      "linuxParameters": null,
      "cpu": 0,
      "environment": [
        {
          "name": "DEEPFENCE_KEY",
          "value": "<DEEPFENCE_KEY>"
        },
        {
          "name": "MGMT_CONSOLE_URL",
          "value": "<MGMT_CONSOLE_URL>"
        },
        {
          "name": "USER_DEFINED_TAGS",
          "value": ""
        }
      ],
      "resourceRequirements": null,
      "ulimits": null,
      "dnsServers": [],
      "mountPoints": [
        {
          "readOnly": true,
          "containerPath": "/fenced/mnt/host",
          "sourceVolume": "Host"
        },
        {
          "readOnly": false,
          "containerPath": "/sys/kernel/debug",
          "sourceVolume": "SysKernelDebug"
        },
        {
          "readOnly": false,
          "containerPath": "/var/run/docker.sock",
          "sourceVolume": "DockerSock"
        },
        {
          "readOnly": false,
          "containerPath": "/var/log/fenced",
          "sourceVolume": "VarLogFenced"
        }
      ],
      "workingDirectory": null,
      "secrets": null,
      "dockerSecurityOptions": [],
      "memory": null,
      "memoryReservation": null,
      "volumesFrom": [],
      "stopTimeout": null,
      "image": "docker.io/deepfenceio/deepfence_agent_ce:2.0.1",
      "startTimeout": null,
      "firelensConfiguration": null,
      "dependsOn": null,
      "disableNetworking": null,
      "interactive": null,
      "healthCheck": null,
      "essential": true,
      "links": [],
      "hostname": null,
      "extraHosts": null,
      "pseudoTerminal": null,
      "user": null,
      "readonlyRootFilesystem": null,
      "dockerLabels": {},
      "systemControls": [],
      "privileged": true,
      "name": "deepfence"
    }
  ],
  "placementConstraints": [],
  "memory": "2048",
  "family": "deepfence-agent-ec2-provider",
  "pidMode": null,
  "requiresCompatibilities": [
    "EC2"
  ],
  "networkMode": "host",
  "runtimePlatform": {
    "operatingSystemFamily": "LINUX",
    "cpuArchitecture": "X86_64"
  },
  "cpu": "512",
  "inferenceAccelerators": null,
  "proxyConfiguration": null,
  "volumes": [
    {
      "fsxWindowsFileServerVolumeConfiguration": null,
      "efsVolumeConfiguration": null,
      "name": "SysKernelDebug",
      "host": {
        "sourcePath": "/sys/kernel/debug"
      },
      "dockerVolumeConfiguration": null
    },
    {
      "fsxWindowsFileServerVolumeConfiguration": null,
      "efsVolumeConfiguration": null,
      "name": "DockerSock",
      "host": {
        "sourcePath": "/var/run/docker.sock"
      },
      "dockerVolumeConfiguration": null
    },
    {
      "fsxWindowsFileServerVolumeConfiguration": null,
      "efsVolumeConfiguration": null,
      "name": "VarLogFenced",
      "host": {
        "sourcePath": null
      },
      "dockerVolumeConfiguration": null
    },
    {
      "fsxWindowsFileServerVolumeConfiguration": null,
      "efsVolumeConfiguration": null,
      "name": "Host",
      "host": {
        "sourcePath": "/"
      },
      "dockerVolumeConfiguration": null
    }
  ]
}
```
- Select the container "deepfence" and select `Auto-configure CloudWatch Logs` for `Log configuration`
- Then create the new task definition.

5. Create a new service to execute the Task and deploy the agent
- Use Old ECS Experience (old UI)
- Go to the "Elastic Container Service" dashboard from the AWS console
- Go to "Task definitions"
- Select previously created task definition
- Select "Actions" > "Create service"
- Select Launch type: `EC2`
- Choose the ECS cluster to deploy
- Provide a name to your service (e.g. `deepfence-agent-ec2-service`)
- Set `Service Type` as `DAEMON`
- Create the service

6. Monitor the service creation and check if the task is in running state. It can take a couple of minutes

7. If the task is running, you should see the agent appearing in your console, well done!
