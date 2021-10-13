package aws

import (
	"context"
	"strings"
	"sync"

	"github.com/turbot/steampipe-plugin-sdk/grpc/proto"
	"github.com/turbot/steampipe-plugin-sdk/plugin/transform"

	"github.com/aws/aws-sdk-go/service/ecs"
	"github.com/turbot/steampipe-plugin-sdk/plugin"
)

//// TABLE DEFINITION

func tableAwsEcsTask(_ context.Context) *plugin.Table {
	return &plugin.Table{
		Name:        "aws_ecs_task",
		Description: "AWS ECS Task",
		List: &plugin.ListConfig{
			Hydrate:           listEcsTasks,
			ParentHydrate:     listEcsClusters,
			ShouldIgnoreError: isNotFoundError([]string{"ClusterNotFoundException"}),
		},
		GetMatrixItem: BuildRegionList,
		Columns: awsRegionalColumns([]*plugin.Column{
			{
				Name:        "task_arn",
				Description: "The Amazon Resource Name (ARN) that identifies the task.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "task_definition_arn",
				Description: "The ARN of the task definition from which the task was created.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "cpu",
				Description: "The number of cpu units used by the task.",
				Type:        proto.ColumnType_INT,
			},
			{
				Name:        "desired_status",
				Description: "The desired status of the task.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "last_status",
				Description: "The last known status of the task.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "health_status",
				Description: "The health status of the task.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "launch_type",
				Description: "The infrastructure on which your task is running.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "availability_zone",
				Description: "The availability zone of the task.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "cluster_arn",
				Description: "The ARN of the cluster that hosts the task.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "memory",
				Description: "The amount (in MiB) of memory used by the task.",
				Type:        proto.ColumnType_INT,
			},
			{
				Name:        "connectivity",
				Description: "The connectivity status of a task.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "container_instance_arn",
				Description: "The ARN of the container instances that host the task.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "enable_execute_command",
				Description: "Whether or not execute command functionality is enabled for this task.",
				Type:        proto.ColumnType_BOOL,
			},
			{
				Name:        "execution_stopped_at",
				Description: "The Unix timestamp for when the task execution stopped.",
				Type:        proto.ColumnType_TIMESTAMP,
			},
			{
				Name:        "group",
				Description: "The name of the task group associated with the task.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "created_at",
				Description: "The Unix timestamp for when the task was created (the task entered the PENDING state).",
				Type:        proto.ColumnType_TIMESTAMP,
			},
			{
				Name:        "platform_version",
				Description: "The platform version on which your task is running.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "pull_started_at",
				Description: "The Unix timestamp for when the container image pull began.",
				Type:        proto.ColumnType_TIMESTAMP,
			},
			{
				Name:        "pull_stopped_at",
				Description: "The Unix timestamp for when the container image pull completed.",
				Type:        proto.ColumnType_TIMESTAMP,
			},
			{
				Name:        "started_at",
				Description: "The Unix timestamp for when the task started (the task transitioned from the PENDING state to the RUNNING state).",
				Type:        proto.ColumnType_TIMESTAMP,
			},
			{
				Name:        "started_by",
				Description: "The tag specified when a task is started.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "stop_code",
				Description: "The stop code indicating why a task was stopped.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "stopped_at",
				Description: "The Unix timestamp for when the task was stopped (the task transitioned from the RUNNING state to the STOPPED state).",
				Type:        proto.ColumnType_TIMESTAMP,
			},
			{
				Name:        "stopped_reason",
				Description: "The reason that the task was stopped.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "stopping_at",
				Description: "The Unix timestamp for when the task stops (transitions from the RUNNING state to STOPPED).",
				Type:        proto.ColumnType_TIMESTAMP,
			},
			{
				Name:        "version",
				Description: "The version counter for the task.",
				Type:        proto.ColumnType_INT,
			},
			{
				Name:        "containers",
				Description: "A list of containers that make up your task.",
				Type:        proto.ColumnType_JSON,
			},
			{
				Name:        "inference_accelerators",
				Description: "The Elastic Inference accelerator associated with the task.",
				Type:        proto.ColumnType_JSON,
			},
			{
				Name:        "overrides",
				Description: "One or more container overrides for the task.",
				Type:        proto.ColumnType_JSON,
			},
			{
				Name:        "attributes",
				Description: "The attributes of the task.",
				Type:        proto.ColumnType_JSON,
			},
			{
				Name:        "ephemeral_storage",
				Description: "The ephemeral storage settings for the task.",
				Type:        proto.ColumnType_JSON,
			},
			{
				Name:        "tags_src",
				Description: "A list of tags associated with task.",
				Type:        proto.ColumnType_JSON,
				Transform:   transform.FromField("Tags"),
			},

			// Standard columns
			{
				Name:        "title",
				Description: resourceInterfaceDescription("title"),
				Type:        proto.ColumnType_STRING,
				Transform:   transform.FromP(getAwsEcsTaskTurbotData, "Title"),
			},
			{
				Name:        "tags",
				Description: resourceInterfaceDescription("tags"),
				Type:        proto.ColumnType_JSON,
				Transform:   transform.FromP(getAwsEcsTaskTurbotData, "Tags"),
			},
			{
				Name:        "akas",
				Description: resourceInterfaceDescription("akas"),
				Type:        proto.ColumnType_JSON,
				Transform:   transform.FromField("TaskArn").Transform(transform.EnsureStringArray),
			},
		}),
	}
}

//// LIST FUNCTION

func listEcsTasks(ctx context.Context, d *plugin.QueryData, h *plugin.HydrateData) (interface{}, error) {
	// Create Session
	svc, err := EcsService(ctx, d)
	if err != nil {
		return nil, err
	}

	// Get cluster details
	cluster := h.Item.(*ecs.Cluster)

	// List all available ECS tasks
	var taskNames [][]*string
	err = svc.ListTasksPages(
		&ecs.ListTasksInput{
			Cluster: cluster.ClusterArn,
		},
		func(page *ecs.ListTasksOutput, isLast bool) bool {
			if len(page.TaskArns) != 0 {
				// Create a chunk of array of size 10
				taskNames = append(taskNames, page.TaskArns)
			}
			return !isLast
		},
	)
	if err != nil {
		return nil, err
	}

	var wg sync.WaitGroup
	taskCh := make(chan *ecs.DescribeTasksOutput, len(taskNames))
	errorCh := make(chan error, len(taskNames))

	for _, taskData := range taskNames {
		wg.Add(1)
		go getTaskDataAsync(taskData, cluster.ClusterArn, svc, &wg, taskCh, errorCh)
	}

	// wait for all services to be processed
	wg.Wait()

	// NOTE: close channel before ranging over results
	close(taskCh)
	close(errorCh)

	for err := range errorCh {
		// return the first error
		return nil, err
	}

	for result := range taskCh {
		for _, service := range result.Tasks {
			d.StreamListItem(ctx, service)
		}
	}
	return nil, nil

}

//// HYDRATE FUNCTIONS

func getTaskDataAsync(taskData []*string, clusterARN *string, svc *ecs.ECS, wg *sync.WaitGroup, taskCh chan *ecs.DescribeTasksOutput, errorCh chan error) {
	defer wg.Done()
	rowData, err := getEcsTask(taskData, clusterARN, svc)
	if err != nil {
		errorCh <- err
	} else if rowData != nil {
		taskCh <- rowData
	}
}

func getEcsTask(taskData []*string, clusterARN *string, svc *ecs.ECS) (*ecs.DescribeTasksOutput, error) {
	params := &ecs.DescribeTasksInput{
		Tasks:   taskData,
		Cluster: clusterARN,
	}
	response, err := svc.DescribeTasks(params)
	if err != nil {
		return nil, err
	}
	return response, nil
}

//// TRANSFORM FUNCTIONS

func getAwsEcsTaskTurbotData(_ context.Context, d *transform.TransformData) (interface{}, error) {
	param := d.Param.(string)
	ecsTask := d.HydrateItem.(*ecs.Task)

	// Get resource title
	arn := ecsTask.TaskArn
	splitArn := strings.Split(*arn, "/")
	title := splitArn[len(splitArn)-1]

	if param == "Tags" {
		if ecsTask.Tags == nil {
			return nil, nil
		}

		// Get the resource tags
		if ecsTask.Tags != nil {
			turbotTagsMap := map[string]string{}
			for _, i := range ecsTask.Tags {
				turbotTagsMap[*i.Key] = *i.Value
			}
			return turbotTagsMap, nil
		}
	}

	return title, nil
}
