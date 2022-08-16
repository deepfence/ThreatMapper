---
title: Amazon ECS
---

# Amazon ECS

In Amazon ECS, the ThreatMapper sensor agents are deployed as a daemon service using a task definition. 

## Before you Begin

Grant IAM permissions for ECS task execution role to access this secret as outlined in the following documents:

 * [Amazon ECS task execution IAM role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html)
 * [Private registry authentication for tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/private-auth.html).


## Create New Task Definition

### Select EC2 launch type

| ![Create a new Task Definition](../img/DF_ECS_Deployment1.jpeg) |
| :--: |
| *Create a new Task Definition* |

### Chose to "Configure via JSON"

| ![Select "Configure via JSON"](../img/DF_ECS_Deployment2.jpeg) |
| :--: |
| *Select "Configure via JSON"* |

### Provide the JSON configuration

Empty the contents and paste the contents of this file: [ecs_task_definition.json](https://github.com/deepfence/ThreatMapper/blob/master/deployment-scripts/ecs_task_definition.json).

### Set Additional Task parameters

Edit the "Task Definition Name", "Task Role" and "Task Execution Role" according to your requirements

| ![Set Additional Task parameters](../img/DF_ECS_Deployment3.jpeg) |
| :--: |
| *Set Additional Task parameters* |

Set image as `docker.io/deepfenceio/deepfence_agent_ce:latest`, or use a tagged version that matches your management console.

### Set Deepfence Parameters

Change the ip address “0.0.0.0” to the IP address of Deepfence Management Console.

In `DEEPFENCE_KEY` field, replace `C8TtyEtNB0gBo1wGhpeAZICNSAaGWw71BSdS2kLELY0` with your [API Key](../console/initial-configuration).

| ![Set Deepfence Parameters](../img/DF_ECS_Deployment5.png) |
| :--: |
| *Set Deepfence Parameters* |

Save the task definition.


## Deploy Deepfence Agent Service

### Create and Define the Agent Service

In your cluster, click "Create" button in "Service" tab.

Set:
 * launch type as *EC2*
 * service type as *DAEMON*
 * minimum healthy percent as *99*:

| ![Set Agent Service Parameters](../img/DF_ECS_Deployment6.jpeg) |
| :--: |
| *Set Agent Service Parameters* |


Save these changes.

In the next page, set :

 * Load Balancer Type as *None*.
 * Leave everything else at their default values.

Save these changes.
