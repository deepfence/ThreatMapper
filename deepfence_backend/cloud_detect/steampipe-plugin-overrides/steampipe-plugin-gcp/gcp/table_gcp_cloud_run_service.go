package gcp

import (
	"context"
	"github.com/turbot/steampipe-plugin-sdk/grpc/proto"
	"github.com/turbot/steampipe-plugin-sdk/plugin"
	"github.com/turbot/steampipe-plugin-sdk/plugin/transform"
	"google.golang.org/api/run/v1"
)

func tableGcpCloudRunService(ctx context.Context) *plugin.Table {
	return &plugin.Table{
		Name:        "gcp_cloud_run_service",
		Description: "GCP Cloud Run Service",
		Get: &plugin.GetConfig{
			KeyColumns: plugin.SingleColumn("name"),
			Hydrate:    getCloudRunService,
		},
		List: &plugin.ListConfig{
			Hydrate: listCloudRunServices,
		},
		Columns: []*plugin.Column{
			// commonly used columns
			{
				Name:        "name",
				Description: "The name of the cloud run service.",
				Type:        proto.ColumnType_STRING,
				Transform:   transform.FromField("Metadata.Name"),
			},
			{
				Name:        "status",
				Description: "Status communicates the observed state of the Service (from the controller).",
				Type:        proto.ColumnType_JSON,
			},
			{
				Name:        "spec",
				Description: "Spec holds the desired state of the Service (from the client).",
				Type:        proto.ColumnType_STRING,
			},


			// standard steampipe columns
			{
				Name:        "title",
				Description: ColumnDescriptionTitle,
				Type:        proto.ColumnType_STRING,
				Transform:   transform.FromField("Metadata.Name"),
			},
			{
				Name:        "tags",
				Description: ColumnDescriptionTags,
				Type:        proto.ColumnType_JSON,
				Transform:   transform.FromField("Metadata.Labels"),
			},
			{
				Name:        "akas",
				Description: ColumnDescriptionAkas,
				Type:        proto.ColumnType_JSON,
				Transform:   transform.FromP(gcpCloudRunServiceTurbotData, "Akas"),
			},

			// standard gcp columns
			{
				Name:        "project",
				Description: ColumnDescriptionProject,
				Type:        proto.ColumnType_STRING,
				Transform:   transform.FromP(gcpCloudRunServiceTurbotData, "Project"),
			},
		},
	}
}

//// HYDRATE FUNCTIONS

func listCloudRunServices(ctx context.Context, d *plugin.QueryData, _ *plugin.HydrateData) (interface{}, error) {
	logger := plugin.Logger(ctx)
	logger.Trace("listCloudRunServices")

	// Create Service Connection
	service, err := CloudRunService(ctx, d)
	if err != nil {
		return nil, err
	}

	// Get project details
	projectData, err := activeProject(ctx, d)
	if err != nil {
		return nil, err
	}
	project := projectData.Project

	data := "namespaces/" + project + "/services"

	resp, err := service.Namespaces.Services.List(data).Do()

	return resp.Items, nil
}

func getCloudRunService(ctx context.Context, d *plugin.QueryData, h *plugin.HydrateData) (interface{}, error) {
	logger := plugin.Logger(ctx)
	logger.Trace("GetCloudRunService")

	// Create Service Connection
	service, err := CloudRunService(ctx, d)
	if err != nil {
		return nil, err
	}

	name := d.KeyColumnQuals["name"].GetStringValue()

	cloudRunService, err := service.Namespaces.Services.Get(name).Do()
	if err != nil {
		return nil, err
	}
	return cloudRunService, nil
}

//// TRANSFORM FUNCTIONS

func gcpCloudRunServiceTurbotData(_ context.Context, d *transform.TransformData) (interface{}, error) {
	service := d.HydrateItem.(*run.Service)
	param := d.Param.(string)

	project := service.Metadata.Namespace

	turbotData := map[string]interface{}{
		"Project": project,
		"Akas":    []string{"gcp://run.googleapis.com/" + service.Metadata.Name},
	}

	return turbotData[param], nil
}

