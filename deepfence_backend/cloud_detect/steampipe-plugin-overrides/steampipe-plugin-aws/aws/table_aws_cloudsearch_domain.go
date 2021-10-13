package aws

import (
	"context"

	"github.com/turbot/steampipe-plugin-sdk/grpc/proto"
	"github.com/turbot/steampipe-plugin-sdk/plugin/transform"

	"github.com/aws/aws-sdk-go/service/cloudsearch"
	"github.com/turbot/steampipe-plugin-sdk/plugin"
)

//// TABLE DEFINITION

func tableAwsCloudSearchDomain(_ context.Context) *plugin.Table {
	return &plugin.Table{
		Name:        "aws_cloudsearch_domain",
		Description: "AWS CloudSearch Domain",
		Get: &plugin.GetConfig{
			KeyColumns: plugin.SingleColumn("domain_name"),
			Hydrate:    getCloudSearchDomain,
		},
		List: &plugin.ListConfig{
			Hydrate: listCloudSearchDomains,
		},
		GetMatrixItem: BuildRegionList,
		Columns: awsRegionalColumns([]*plugin.Column{
			{
				Name:        "domain_name",
				Description: "A string that represents the name of a domain.",
				Type:        proto.ColumnType_STRING,
				Transform:   transform.FromField("DomainName"),
			},
			{
				Name:        "arn",
				Description: "The Amazon Resource Name (ARN) of the search Domain.",
				Type:        proto.ColumnType_STRING,
				Transform:   transform.FromField("ARN"),
			},
			{
				Name:        "created",
				Description: "True if the search domain is created.",
				Type:        proto.ColumnType_BOOL,
			},
			{
				Name:        "deleted",
				Description: "True if the search domain has been deleted.",
				Type:        proto.ColumnType_BOOL,
			},
			{
				Name:        "doc_service",
				Description: "The service endpoint for updating documents in a search domain.",
				Type:        proto.ColumnType_STRING,
				Transform:   transform.FromField("DocService"),
			},
			{
				Name:        "domain_id",
				Description: "An internally generated unique identifier for a domain.",
				Type:        proto.ColumnType_STRING,
				Transform:   transform.FromField("DomainId"),
			},
			{
				Name:        "limits",
				Description: "Partition and Replication limits.",
				Type:        proto.ColumnType_JSON,
			},
			{
				Name:        "processing",
				Description: "True if processing is being done to activate the current domain configuration.",
				Type:        proto.ColumnType_BOOL,
			},
			{
				Name:        "requires_index_documents",
				Description: "True if IndexDocuments needs to be called to activate the current domain configuration.",
				Type:        proto.ColumnType_BOOL,
			},
			{
				Name:        "search_instance_count",
				Description: "The number of search instances that are available to process search requests.",
				Type:        proto.ColumnType_INT,
			},
			{
				Name:        "search_instance_type",
				Description: "The instance type that is being used to process search requests.",
				Type:        proto.ColumnType_STRING,
			},
			{
				Name:        "search_partition_count",
				Description: "The number of partitions across which the search index is spread.",
				Type:        proto.ColumnType_INT,
			},
			{
				Name:        "search_service",
				Description: "The service endpoint for requesting search results from a search domain.",
				Type:        proto.ColumnType_JSON,
			},

			// Standard columns
			{
				Name:        "title",
				Description: resourceInterfaceDescription("title"),
				Type:        proto.ColumnType_STRING,
				Transform:   transform.FromField("DomainId"),
			},
			{
				Name:        "akas",
				Description: resourceInterfaceDescription("akas"),
				Type:        proto.ColumnType_JSON,
				Transform:   transform.FromField("ARN").Transform(arnToAkas),
			},
		}),
	}
}

//// LIST FUNCTION

func listCloudSearchDomains(ctx context.Context, d *plugin.QueryData, _ *plugin.HydrateData) (interface{}, error) {
	plugin.Logger(ctx).Trace("listCloudSearchDomains")

	// Create Session
	svc, err := CloudSearchService(ctx, d)
	if err != nil {
		return nil, err
	}

	// List call
	op, err := svc.DescribeDomains(
		&cloudsearch.DescribeDomainsInput{},
	)
	if op.DomainStatusList != nil && len(op.DomainStatusList) > 0 {
		return op.DomainStatusList, nil
	}
	return nil, err
}

//// HYDRATE FUNCTIONS

func getCloudSearchDomain(ctx context.Context, d *plugin.QueryData, _ *plugin.HydrateData) (interface{}, error) {
	domainName := d.KeyColumnQuals["domain_name"].GetStringValue()

	// Create service
	svc, err := CloudSearchService(ctx, d)
	if err != nil {
		return nil, err
	}

	params := &cloudsearch.DescribeDomainsInput{
		DomainNames: []*string{&domainName},
	}

	op, err := svc.DescribeDomains(params)
	if err != nil {
		return nil, err
	}

	if op.DomainStatusList != nil && len(op.DomainStatusList) > 0 {
		return op.DomainStatusList[0], nil
	}
	return nil, nil
}
