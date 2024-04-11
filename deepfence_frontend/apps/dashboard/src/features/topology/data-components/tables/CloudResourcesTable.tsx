import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo, useState } from 'react';
import { generatePath, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Combobox,
  ComboboxOption,
  createColumnHelper,
  SortingState,
  Table,
  TableNoDataElement,
  TableSkeleton,
} from 'ui-components';

import { ModelCloudResource } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { SearchableCloudAccountsList } from '@/components/forms/SearchableCloudAccountsList';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TimesIcon } from '@/components/icons/common/Times';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { TruncatedText } from '@/components/TruncatedText';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { getNodeImage } from '@/features/topology/utils/graph-styles';
import { queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import { isScanComplete } from '@/utils/scan';
import {
  getOrderFromSearchParams,
  getPageFromSearchParams,
  useSortingState,
} from '@/utils/table';

const DEFAULT_PAGE_SIZE = 25;

function useSearchCloudResourcesWithPagination() {
  const [searchParams] = useSearchParams();
  return useSuspenseQuery({
    ...queries.search.cloudResourcesWithPagination({
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      order: getOrderFromSearchParams(searchParams),
      cloudProvider: searchParams.getAll('cloudProvider'),
      serviceType: searchParams.getAll('serviceType'),
      awsAccountId: searchParams.getAll('aws_account_ids'),
      gcpAccountId: searchParams.getAll('gcp_account_ids'),
      azureAccountId: searchParams.getAll('azure_account_ids'),
    }),
    keepPreviousData: true,
  });
}

const SERVICE_TYPES = [
  'aws_iam_account_summary',
  'aws_account',
  'aws_iam_virtual_mfa_device',
  'aws_iam_access_key',
  'aws_iam_user',
  'aws_iam_account_password_policy',
  'aws_account_alternate_contact',
  'aws_iam_policy',
  'aws_iam_role',
  'aws_iam_server_certificate',
  'aws_region',
  'aws_s3_bucket',
  'aws_accessanalyzer_analyzer',
  'aws_macie2_classification_job',
  'aws_ebs_volume',
  'aws_rds_db_instance',
  'aws_efs_file_system',
  'aws_s3_account_settings',
  'aws_cloudtrail_trail',
  'aws_config_configuration_recorder',
  'aws_kms_key',
  'aws_vpc',
  'aws_vpc_flow_log',
  'aws_sns_topic_subscription',
  'aws_securityhub_hub',
  'aws_vpc_network_acl',
  'aws_vpc_security_group',
  'aws_vpc_security_group_rule',
  'aws_ec2_application_load_balancer',
  'aws_redshift_cluster',
  'aws_acm_certificate',
  'aws_api_gateway_stage',
  'aws_cloudfront_distribution',
  'aws_ec2_classic_load_balancer',
  'aws_dax_cluster',
  'aws_dynamodb_table',
  'aws_elasticsearch_domain',
  'aws_cloudwatch_log_group',
  'aws_rds_db_cluster_snapshot',
  'aws_rds_db_snapshot',
  'aws_sagemaker_endpoint_configuration',
  'aws_sagemaker_notebook_instance',
  'aws_sns_topic',
  'aws_wafv2_web_acl',
  'aws_ec2_autoscaling_group',
  'aws_api_gatewayv2_route',
  'aws_api_gatewayv2_stage',
  'aws_ec2_launch_configuration',
  'aws_cloudformation_stack',
  'aws_codebuild_project',
  'aws_dms_replication_instance',
  'aws_ebs_snapshot',
  'aws_ec2_regional_settings',
  'aws_ec2_instance',
  'aws_vpc_subnet',
  'aws_vpc_endpoint',
  'aws_vpc_vpn_connection',
  'aws_ec2_transit_gateway',
  'aws_ec2_network_interface',
  'aws_ec2_launch_template',
  'aws_ecr_repository',
  'aws_ecs_task_definition',
  'aws_ecs_service',
  'aws_ecs_cluster',
  'aws_efs_access_point',
  'aws_eks_cluster',
  'aws_elasticache_replication_group',
  'aws_elasticache_cluster',
  'aws_elastic_beanstalk_environment',
  'aws_emr_cluster',
  'aws_guardduty_detector',
  'aws_kinesis_stream',
  'aws_lambda_function',
  'aws_networkfirewall_firewall_policy',
  'aws_networkfirewall_rule_group',
  'aws_opensearch_domain',
  'aws_ec2_network_load_balancer',
  'aws_ec2_gateway_load_balancer',
  'aws_rds_db_cluster',
  'aws_rds_db_event_subscription',
  'aws_secretsmanager_secret',
  'aws_sqs_queue',
  'aws_ssm_managed_instance',
  'aws_waf_web_acl',
  'aws_wafregional_rule',
  'aws_wafregional_rule_group',
  'aws_wafregional_web_acl',
  'aws_waf_rule',
  'aws_waf_rule_group',
  'aws_vpc_internet_gateway',
  'aws_iam_group',
  'aws_cloudwatch_alarm',
  'aws_guardduty_finding',
  'aws_backup_plan',
  'aws_backup_recovery_point',
  'aws_backup_vault',
  'aws_backup_protected_resource',
  'aws_backup_selection',
  'aws_fsx_file_system',
  'aws_vpc_route_table',
  'aws_vpc_eip',
  'aws_codedeploy_app',
  'azuread_user',
  'azure_subscription',
  'azuread_authorization_policy',
  'azure_security_center_subscription_pricing',
  'azuread_conditional_access_policy',
  'azure_tenant',
  'azure_role_definition',
  'azure_security_center_auto_provisioning',
  'azure_security_center_contact',
  'azure_security_center_setting',
  'azure_storage_account',
  'azure_storage_container',
  'azure_sql_server',
  'azure_sql_database',
  'azure_postgresql_server',
  'azure_mysql_server',
  'azure_cosmosdb_account',
  'azure_diagnostic_setting',
  'azure_key_vault',
  'azure_log_alert',
  'azure_network_security_group',
  'azure_location',
  'azure_network_watcher',
  'azure_compute_virtual_machine',
  'azure_compute_disk',
  'azure_network_watcher_flow_log',
  'azure_key_vault_key',
  'azure_key_vault_secret',
  'azure_app_service_web_app',
  'azure_app_service_function_app',
  'azure_automation_variable',
  'azure_redis_cache',
  'azure_service_fabric_cluster',
  'azure_role_assignment',
  'azure_policy_assignment',
  'azure_cognitive_account',
  'azure_security_center_jit_network_access_policy',
  'azure_kubernetes_cluster',
  'azure_api_management',
  'azure_app_configuration',
  'azure_compute_disk_access',
  'azure_container_registry',
  'azure_data_factory',
  'azure_eventgrid_domain',
  'azure_eventgrid_topic',
  'azure_eventhub_namespace',
  'azure_healthcare_service',
  'azure_mariadb_server',
  'azure_search_service',
  'azure_servicebus_namespace',
  'azure_signalr_service',
  'azure_network_interface',
  'azure_storage_sync',
  'azure_synapse_workspace',
  'azure_spring_cloud_service',
  'azure_hybrid_compute_machine',
  'azure_batch_account',
  'azure_compute_virtual_machine_scale_set',
  'azure_data_lake_analytics_account',
  'azure_data_lake_store',
  'azure_iothub',
  'azure_logic_app_workflow',
  'azure_stream_analytics_job',
  'azure_resource_link',
  'azure_mssql_managed_instance',
  'azure_application_gateway',
  'azure_frontdoor',
  'azure_virtual_network',
  'azure_hdinsight_cluster',
  'azure_hpc_cache',
  'azure_kusto_cluster',
  'azure_machine_learning_workspace',
  'azure_app_service_environment',
  'azure_databox_edge_device',
  'azure_application_insight',
  'azure_lb',
  'azure_public_ip',
  'azure_virtual_network_gateway',
  'azure_bastion_host',
  'azure_key_vault_managed_hardware_security_module',
  'azure_log_profile',
  'azure_subnet',
  'gcp_kms_key',
  'gcp_sql_database_instance',
  'gcp_service_account_key',
  'gcp_iam_policy',
  'gcp_bigquery_dataset',
  'gcp_compute_firewall',
  'gcp_project',
  'gcp_service_account',
  'gcp_organization',
  'gcp_dataproc_cluster',
  'gcp_audit_policy',
  'gcp_logging_sink',
  'gcp_logging_metric',
  'gcp_compute_network',
  'gcp_project_service',
  'gcp_dns_policy',
  'gcp_dns_managed_zone',
  'gcp_compute_subnetwork',
  'gcp_compute_target_ssl_proxy',
  'gcp_compute_instance',
  'gcp_compute_target_https_proxy',
  'gcp_compute_disk',
  'gcp_storage_bucket',
  'gcp_compute_project_metadata',
  'gcp_bigquery_table',
  'gcp_compute_url_map',
  'gcp_kubernetes_cluster',
];

export const CloudResourcesTable = () => {
  const [searchParams] = useSearchParams();
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  return (
    <div className="px-4 pb-4">
      <div className="h-12 flex items-center">
        <Button
          variant="flat"
          className="ml-auto"
          startIcon={<FilterIcon />}
          endIcon={
            getAppliedFiltersCount(searchParams) > 0 ? (
              <Badge
                label={String(getAppliedFiltersCount(searchParams))}
                variant="filled"
                size="small"
                color="blue"
              />
            ) : null
          }
          size="sm"
          onClick={() => {
            setFiltersExpanded((prev) => !prev);
          }}
        >
          Filter
        </Button>
      </div>

      {filtersExpanded ? <Filters /> : null}
      <Suspense
        fallback={<TableSkeleton rows={DEFAULT_PAGE_SIZE} columns={8} size="default" />}
      >
        <DataTable />
      </Suspense>
    </div>
  );
};

const FILTER_SEARCHPARAMS: Record<string, string> = {
  cloudProvider: 'Cloud provider',
  serviceType: 'Service type',
  aws_account_ids: 'AWS account',
  gcp_account_ids: 'GCP account',
  azure_account_ids: 'Azure account',
};

const CLOUD_PROVIDERS = [
  {
    label: 'AWS',
    value: 'aws',
  },
  {
    label: 'GCP',
    value: 'gcp',
  },
  {
    label: 'Azure',
    value: 'azure',
  },
];

const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};

function Filters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [serviceTypeSearchText, setServiceTypeSearchText] = useState('');
  const [cloudProvidersSearchText, setCloudProvidersSearchText] = useState('');
  const appliedFilterCount = getAppliedFiltersCount(searchParams);

  return (
    <FilterWrapper>
      <div className="flex gap-2">
        <Combobox
          value={searchParams.getAll('cloudProvider')}
          multiple
          onQueryChange={(query) => {
            setCloudProvidersSearchText(query);
          }}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('cloudProvider');
              values.forEach((value) => {
                prev.append('cloudProvider', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          getDisplayValue={() => FILTER_SEARCHPARAMS['cloudProvider']}
        >
          {CLOUD_PROVIDERS.filter((item) => {
            if (!cloudProvidersSearchText.length) return true;
            return item.label
              .toLowerCase()
              .includes(cloudProvidersSearchText.toLowerCase());
          }).map((item) => {
            return (
              <ComboboxOption key={item.value} value={item.value}>
                {item.label}
              </ComboboxOption>
            );
          })}
        </Combobox>
        <Combobox
          value={searchParams.getAll('serviceType')}
          nullable
          multiple
          onQueryChange={(query) => {
            setServiceTypeSearchText(query);
          }}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('serviceType');
              values.forEach((value) => {
                prev.append('serviceType', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          getDisplayValue={() => FILTER_SEARCHPARAMS['serviceType']}
        >
          {SERVICE_TYPES.filter((item) => {
            if (!serviceTypeSearchText.length) return true;
            return item.toLowerCase().includes(serviceTypeSearchText.toLowerCase());
          }).map((item) => {
            return (
              <ComboboxOption key={item} value={item}>
                {item}
              </ComboboxOption>
            );
          })}
        </Combobox>
        <SearchableCloudAccountsList
          cloudProvider="aws"
          displayValue="AWS account"
          defaultSelectedAccounts={searchParams.getAll('aws_account_ids')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('aws_account_ids');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('aws_account_ids');
              value.forEach((id) => {
                prev.append('aws_account_ids', id);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
        <SearchableCloudAccountsList
          cloudProvider="gcp"
          displayValue="GCP account"
          defaultSelectedAccounts={searchParams.getAll('gcp_account_ids')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('gcp_account_ids');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('gcp_account_ids');
              value.forEach((id) => {
                prev.append('gcp_account_ids', id);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
        <SearchableCloudAccountsList
          cloudProvider="azure"
          displayValue="Azure account"
          defaultSelectedAccounts={searchParams.getAll('azure_account_ids')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('azure_account_ids');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('azure_account_ids');
              value.forEach((id) => {
                prev.append('azure_account_ids', id);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
      </div>
      {appliedFilterCount > 0 ? (
        <div className="flex gap-2.5 mt-4 flex-wrap items-center">
          {Array.from(searchParams)
            .filter(([key]) => {
              return Object.keys(FILTER_SEARCHPARAMS).includes(key);
            })
            .map(([key, value]) => {
              return (
                <FilterBadge
                  key={`${key}-${value}`}
                  onRemove={() => {
                    setSearchParams((prev) => {
                      const existingValues = prev.getAll(key);
                      prev.delete(key);
                      existingValues.forEach((existingValue) => {
                        if (existingValue !== value) prev.append(key, existingValue);
                      });
                      prev.delete('page');
                      return prev;
                    });
                  }}
                  text={`${FILTER_SEARCHPARAMS[key]}: ${value}`}
                />
              );
            })}
          <Button
            variant="flat"
            color="default"
            startIcon={<TimesIcon />}
            onClick={() => {
              setSearchParams((prev) => {
                Object.keys(FILTER_SEARCHPARAMS).forEach((key) => {
                  prev.delete(key);
                });
                prev.delete('page');
                return prev;
              });
            }}
            size="sm"
          >
            Clear all
          </Button>
        </div>
      ) : null}
    </FilterWrapper>
  );
}

const DataTable = () => {
  const { mode } = useTheme();
  const { data } = useSearchCloudResourcesWithPagination();
  const columnHelper = createColumnHelper<ModelCloudResource>();
  const [sort, setSort] = useSortingState();
  const [searchParams, setSearchParams] = useSearchParams();

  const columns = useMemo(
    () => [
      columnHelper.accessor('node_name', {
        cell: (info) => {
          if (isScanComplete(info.row.original.cloud_compliance_scan_status)) {
            return (
              <DFLink
                to={{
                  pathname: generatePath(
                    `/posture/cloud/scan-results/:cloudProvider/:scanId`,
                    {
                      scanId: encodeURIComponent(
                        info.row.original.cloud_compliance_latest_scan_id,
                      ),
                      cloudProvider: info.row.original.cloud_provider,
                    },
                  ),
                  search: `?resources=${encodeURIComponent(info.row.original.node_id)}`,
                }}
                target="_blank"
              >
                <TruncatedText text={info.getValue()} />
              </DFLink>
            );
          }
          return <TruncatedText text={info.getValue()} />;
        },
        header: () => 'Name',
        minSize: 100,
        size: 180,
        maxSize: 300,
      }),
      columnHelper.accessor('node_type', {
        cell: (info) => {
          const imagePath =
            getNodeImage(mode, info.row.original.node_type) ??
            getNodeImage(mode, 'cloud_provider', info.row.original.cloud_provider);
          return (
            <div className="flex items-center gap-2">
              <div className="shrink-0 text-text-input-value">
                <img src={imagePath} alt={info.getValue()} height={24} width={24} />
              </div>
              <TruncatedText text={info.getValue()} />
            </div>
          );
        },
        header: () => <TruncatedText text="Service type" />,
        minSize: 80,
        size: 100,
        maxSize: 300,
      }),
      columnHelper.accessor('cloud_provider', {
        cell: (info) => {
          return (
            <div className="flex items-center gap-2 uppercase">
              <div className="shrink-0">
                <img
                  src={getNodeImage(mode, 'cloud_provider', info.getValue())}
                  alt={info.getValue()}
                  height={24}
                  width={24}
                />
              </div>
              <TruncatedText text={info.getValue()} />
            </div>
          );
        },
        header: () => <TruncatedText text="Cloud provider" />,
        minSize: 50,
        size: 80,
        maxSize: 300,
      }),
      columnHelper.accessor('cloud_region', {
        cell: (info) => {
          return <TruncatedText text={info.getValue()} />;
        },
        header: () => <TruncatedText text="Cloud region" />,
        minSize: 50,
        size: 70,
        maxSize: 300,
      }),
      columnHelper.accessor('cloud_compliance_scan_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <TruncatedText text="Posture scan status" />,
        minSize: 60,
        size: 100,
        maxSize: 300,
        enableSorting: true,
      }),
      columnHelper.accessor('account_id', {
        cell: (info) => {
          if (isScanComplete(info.row.original.cloud_compliance_scan_status)) {
            return (
              <DFLink
                to={{
                  pathname: generatePath(
                    `/posture/cloud/scan-results/:cloudProvider/:scanId`,
                    {
                      scanId: encodeURIComponent(
                        info.row.original.cloud_compliance_latest_scan_id,
                      ),
                      cloudProvider: info.row.original.cloud_provider,
                    },
                  ),
                }}
                target="_blank"
              >
                <TruncatedText text={info.getValue()} />
              </DFLink>
            );
          }
          return <TruncatedText text={info.getValue()} />;
        },
        header: () => <TruncatedText text="Account id" />,
        minSize: 70,
        size: 120,
        maxSize: 300,
      }),
    ],
    [],
  );

  return (
    <Table
      data={data.resources ?? []}
      columns={columns}
      noDataElement={<TableNoDataElement text="No cloud resources are connected" />}
      size="default"
      enableColumnResizing
      enablePagination
      manualPagination
      approximatePagination
      totalRows={data.totalRows}
      pageIndex={data.currentPage}
      onPaginationChange={(updaterOrValue) => {
        let newPageIndex = 0;
        if (typeof updaterOrValue === 'function') {
          newPageIndex = updaterOrValue({
            pageIndex: data.currentPage,
            pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
          }).pageIndex;
        } else {
          newPageIndex = updaterOrValue.pageIndex;
        }
        setSearchParams((prev) => {
          prev.set('page', String(newPageIndex));
          return prev;
        });
      }}
      enableSorting
      manualSorting
      sortingState={sort}
      onSortingChange={(updaterOrValue) => {
        let newSortState: SortingState = [];
        if (typeof updaterOrValue === 'function') {
          newSortState = updaterOrValue(sort);
        } else {
          newSortState = updaterOrValue;
        }
        setSearchParams((prev) => {
          if (!newSortState.length) {
            prev.delete('sortby');
            prev.delete('desc');
          } else {
            prev.set('sortby', String(newSortState[0].id));
            prev.set('desc', String(newSortState[0].desc));
          }
          return prev;
        });
        setSort(newSortState);
      }}
      pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
      enablePageResize
      onPageResize={(newSize) => {
        setSearchParams((prev) => {
          prev.set('size', String(newSize));
          prev.delete('page');
          return prev;
        });
      }}
    />
  );
};
