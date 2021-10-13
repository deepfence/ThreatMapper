package gcp

import (
	"context"

	"github.com/turbot/steampipe-plugin-sdk/plugin"
	"google.golang.org/api/bigquery/v2"
	"google.golang.org/api/bigtableadmin/v2"
	"google.golang.org/api/cloudfunctions/v1"
	"google.golang.org/api/cloudkms/v1"
	"google.golang.org/api/cloudresourcemanager/v1"
	"google.golang.org/api/compute/v1"
	"google.golang.org/api/dns/v1"
	"google.golang.org/api/iam/v1"
	"google.golang.org/api/logging/v2"
	"google.golang.org/api/monitoring/v3"
	"google.golang.org/api/pubsub/v1"
	"google.golang.org/api/run/v1"
	"google.golang.org/api/serviceusage/v1"
	"google.golang.org/api/storage/v1"

	computeBeta "google.golang.org/api/compute/v0.beta"
	sqladmin "google.golang.org/api/sqladmin/v1beta4"
)

// BigQueryService returns the service connection for GCP BigQueryService service
func BigQueryService(ctx context.Context, d *plugin.QueryData) (*bigquery.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "BigQueryService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*bigquery.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := bigquery.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// BigtableAdminService returns the service connection for GCP Bigtable Admin service
func BigtableAdminService(ctx context.Context, d *plugin.QueryData) (*bigtableadmin.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "BigtableAdminService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*bigtableadmin.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := bigtableadmin.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// CloudResourceManagerService returns the service connection for GCP Cloud Resource Manager service
func CloudResourceManagerService(ctx context.Context, d *plugin.QueryData) (*cloudresourcemanager.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "CloudResourceManagerService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*cloudresourcemanager.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := cloudresourcemanager.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// CloudSQLAdminService returns the service connection for GCP Cloud SQL Admin service
func CloudSQLAdminService(ctx context.Context, d *plugin.QueryData) (*sqladmin.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "CloudSQLAdminService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*sqladmin.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := sqladmin.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// ComputeBetaService returns the service connection for GCP Compute service beta version
func ComputeBetaService(ctx context.Context, d *plugin.QueryData) (*computeBeta.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "ComputeBetaService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*computeBeta.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := computeBeta.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// ComputeService returns the service connection for GCP Compute service
func ComputeService(ctx context.Context, d *plugin.QueryData) (*compute.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "ComputeService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*compute.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := compute.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// CloudFunctionsService returns the service connection for GCP Cloud Functions service
func CloudFunctionsService(ctx context.Context, d *plugin.QueryData) (*cloudfunctions.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "CloudFunctionsService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*cloudfunctions.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := cloudfunctions.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// CloudRunService returns the service connection for GCP Cloud Run service
func CloudRunService(ctx context.Context, d *plugin.QueryData) (*run.APIService, error) {
	// have we already created and cached the service?
	serviceCacheKey := "CloudRunService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*run.APIService), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := run.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// DnsService returns the service connection for GCP DNS service
func DnsService(ctx context.Context, d *plugin.QueryData) (*dns.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "DnsService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*dns.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := dns.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// IAMService returns the service connection for GCP IAM service
func IAMService(ctx context.Context, d *plugin.QueryData) (*iam.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "IAMService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*iam.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := iam.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// LoggingService returns the service connection for GCP Logging service
func LoggingService(ctx context.Context, d *plugin.QueryData) (*logging.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "LoggingService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*logging.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := logging.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// MonitoringService returns the service connection for GCP Monitoring service
func MonitoringService(ctx context.Context, d *plugin.QueryData) (*monitoring.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "MonitoringService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*monitoring.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := monitoring.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// PubsubService returns the service connection for GCP Pub/Sub service
func PubsubService(ctx context.Context, d *plugin.QueryData) (*pubsub.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "PubsubService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*pubsub.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := pubsub.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// ServiceUsageService returns the service connection for GCP Service Usage service
func ServiceUsageService(ctx context.Context, d *plugin.QueryData) (*serviceusage.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "ServiceUsageService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*serviceusage.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := serviceusage.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// StorageService returns the service connection for GCP Storgae service
func StorageService(ctx context.Context, d *plugin.QueryData) (*storage.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "StorageService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*storage.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := storage.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}

// KMSService returns the service connection for GCP KMS service
func KMSService(ctx context.Context, d *plugin.QueryData) (*cloudkms.Service, error) {
	// have we already created and cached the service?
	serviceCacheKey := "KMSService"
	if cachedData, ok := d.ConnectionManager.Cache.Get(serviceCacheKey); ok {
		return cachedData.(*cloudkms.Service), nil
	}

	// To get config arguments from plugin config file
	opts := setSessionConfig(d.Connection)

	// so it was not in cache - create service
	svc, err := cloudkms.NewService(ctx, opts...)
	if err != nil {
		return nil, err
	}

	d.ConnectionManager.Cache.Set(serviceCacheKey, svc)
	return svc, nil
}
