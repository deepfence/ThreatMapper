package aws

import (
	"context"
	"sync"

	"github.com/turbot/steampipe-plugin-sdk/grpc/proto"
	"github.com/turbot/steampipe-plugin-sdk/plugin/transform"

	"github.com/aws/aws-sdk-go/service/simpledb"
	"github.com/turbot/steampipe-plugin-sdk/plugin"
)

//// TABLE DEFINITION

func tableAwsSimpleDBDomain(_ context.Context) *plugin.Table {
	return &plugin.Table{
		Name:        "aws_simpledb_domain",
		Description: "AWS SimpleDB Domain",
		List: &plugin.ListConfig{
			Hydrate: listSimpleDBDomains,
		},
		GetMatrixItem: BuildRegionList,
		Columns: awsRegionalColumns([]*plugin.Column{
			{
				Name:        "item_count",
				Description: "The number of all items in the domain.",
				Type:        proto.ColumnType_INT,
				Transform:   transform.FromField("ItemCount"),
			},
			{
				Name:        "timestamp",
				Description: "The data and time when metadata was calculated in Epoch (UNIX) time.",
				Type:        proto.ColumnType_TIMESTAMP,
				Transform:   transform.FromField("Timestamp"),
			},
			{
				Name:        "attribute_value_count",
				Description: "The number of all attribute name/value pairs in the domain.",
				Type:        proto.ColumnType_INT,
			},
			{
				Name:        "attribute_name_count",
				Description: "The number of unique attribute names in the domain.",
				Type:        proto.ColumnType_INT,
			},
			{
				Name:        "item_names_size_bytes",
				Description: "The total size of all item names in the domain, in bytes.",
				Type:        proto.ColumnType_INT,
				Transform:   transform.FromField("ItemNamesSizeBytes"),
			},
			{
				Name:        "attribute_values_size_bytes",
				Description: "The total size of all attribute values, in bytes.",
				Type:        proto.ColumnType_INT,
				Transform:   transform.FromField("AttributeValuesSizeBytes"),
			},
			{
				Name:        "attribute_names_size_bytes",
				Description: "The total size of all unique attribute names, in bytes.",
				Type:        proto.ColumnType_INT,
				Transform:   transform.FromField("AttributeNamesSizeBytes"),
			},
		}),
	}
}

//// LIST FUNCTION

func listSimpleDBDomains(ctx context.Context, d *plugin.QueryData, _ *plugin.HydrateData) (interface{}, error) {
	plugin.Logger(ctx).Trace("listSimpleDBDomains")

	// Create Session
	svc, err := SimpleDBService(ctx, d)
	if err != nil {
		return nil, err
	}

	// List call
	var domainNames []*string
	err = svc.ListDomainsPages(
		&simpledb.ListDomainsInput{},
		func(page *simpledb.ListDomainsOutput, isLast bool) bool {
			if len(page.DomainNames) != 0 {
				domainNames = append(domainNames, page.DomainNames...)
			}
			return !isLast
		},
	)
	if err != nil {
		return nil, err
	}

	var wg sync.WaitGroup
	domainCh := make(chan *simpledb.DomainMetadataOutput, len(domainNames))
	errorCh := make(chan error, len(domainNames))

	for _, domainName := range domainNames {
		wg.Add(1)
		go getDomainMetadataAsync(domainName, svc, &wg, domainCh, errorCh)
	}

	// wait for all services to be processed
	wg.Wait()

	// NOTE: close channel before ranging over results
	close(domainCh)
	close(errorCh)

	for err := range errorCh {
		// return the first error
		return nil, err
	}

	for result := range domainCh {
		d.StreamListItem(ctx, result)
	}
	return nil, nil
}

//// HYDRATE FUNCTIONS

func getDomainMetadataAsync(domainName *string, svc *simpledb.SimpleDB, wg *sync.WaitGroup, taskCh chan *simpledb.DomainMetadataOutput, errorCh chan error) {
	defer wg.Done()
	rowData, err := getSimpleDBDomain(domainName, svc)
	if err != nil {
		errorCh <- err
	} else if rowData != nil {
		taskCh <- rowData
	}
}

func getSimpleDBDomain(domainName *string, svc *simpledb.SimpleDB) (*simpledb.DomainMetadataOutput, error) {
	params := &simpledb.DomainMetadataInput{
		DomainName: domainName,
	}
	response, err := svc.DomainMetadata(params)
	if err != nil {
		return nil, err
	}
	return response, nil
}
