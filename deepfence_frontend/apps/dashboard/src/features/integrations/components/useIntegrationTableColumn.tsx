import { has, isEmpty } from 'lodash-es';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  Tooltip,
} from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ErrorIcon, SuccessIcon } from '@/components/icons/common/ScanStatuses';
import { TruncatedText } from '@/components/TruncatedText';
import {
  ActionEnumType,
  severityMap,
} from '@/features/integrations/pages/IntegrationAdd';

import { IntegrationType } from './IntegrationForm';

const ActionDropdown = ({
  row,
  trigger,
  onTableAction,
}: {
  row: ModelIntegrationListResp;
  trigger: React.ReactNode;
  onTableAction: (row: ModelIntegrationListResp, actionType: ActionEnumType) => void;
}) => {
  return (
    <Dropdown
      triggerAsChild={true}
      align={'start'}
      content={
        <>
          <DropdownItem onClick={() => onTableAction(row, ActionEnumType.EDIT)}>
            Edit
          </DropdownItem>
          <DropdownItem
            onClick={() => onTableAction(row, ActionEnumType.DELETE)}
            color="error"
          >
            Delete
          </DropdownItem>
        </>
      }
    >
      {trigger}
    </Dropdown>
  );
};

export const useIntegrationTableColumn = (
  onTableAction: (row: ModelIntegrationListResp, actionType: ActionEnumType) => void,
) => {
  const { integrationType } = useParams() as {
    integrationType: string;
  };

  if (!integrationType) {
    throw new Error('Integration Type is required');
  }
  const columnHelper = createColumnHelper<ModelIntegrationListResp>();

  const getDynamicTableColumns = () => {
    switch (integrationType) {
      case IntegrationType.slack:
        return [
          columnHelper.accessor('channel', {
            cell: (cell) => cell.row.original.config?.channel,
            header: () => <TruncatedText text={'Channel'} />,
            minSize: 75,
            size: 80,
            maxSize: 85,
          }),
          columnHelper.accessor('webhook_url_masked', {
            cell: (cell) => (
              <TruncatedText text={cell.row.original.config?.webhook_url_masked} />
            ),
            header: () => <TruncatedText text={'URL'} />,
            minSize: 75,
            size: 80,
            maxSize: 85,
          }),
        ];
      case IntegrationType.s3:
        return [
          columnHelper.accessor('aws_region', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.aws_region || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Region'} />,
            minSize: 50,
            size: 55,
            maxSize: 60,
          }),
          columnHelper.accessor('s3_bucket_name', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.s3_bucket_name || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Bucket name'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
          columnHelper.accessor('s3_folder_name', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.s3_folder_name || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Folder name'} />,
            minSize: 50,
            size: 55,
            maxSize: 60,
          }),
          columnHelper.accessor('use_iam_role', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.use_iam_role} />
              ) : (
                '-'
              ),

            header: () => <TruncatedText text={'IAM role'} />,
            minSize: 50,
            size: 55,
            maxSize: 60,
          }),
          columnHelper.accessor('aws_access_key', {
            enableSorting: false,
            cell: (cell) => (
              <TruncatedText text={cell.row.original.config?.aws_access_key || '-'} />
            ),
            header: () => <TruncatedText text="AWS access key" />,
            minSize: 50,
            size: 55,
            maxSize: 60,
          }),
          columnHelper.accessor('aws_account_id', {
            enableSorting: false,
            cell: (cell) => (
              <TruncatedText text={cell.row.original.config?.aws_account_id || '-'} />
            ),
            header: () => <TruncatedText text="AWS account id" />,
            minSize: 50,
            size: 55,
            maxSize: 60,
          }),
          columnHelper.accessor('target_account_role_arn', {
            enableSorting: false,
            cell: (cell) => (
              <TruncatedText
                text={cell.row.original.config?.target_account_role_arn || '-'}
              />
            ),
            header: () => <TruncatedText text="Account role ARN" />,
            minSize: 50,
            size: 55,
            maxSize: 60,
          }),
        ];
      case IntegrationType.jira:
        return [
          columnHelper.display({
            id: 'api_token_masked',
            header: () => <TruncatedText text={'Auth type'} />,
            minSize: 50,
            size: 55,
            maxSize: 60,
            cell: (cell) => {
              if (isEmpty(cell.row.original.config)) {
                return '-';
              }
              const isToken = cell.row.original.config?.api_token_masked !== undefined;
              if (isToken) {
                return <TruncatedText text={'Token'} />;
              } else {
                return <TruncatedText text={'Password'} />;
              }
            },
          }),
          columnHelper.accessor('issueType', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.issueType || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Issue type'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
          columnHelper.accessor('jiraAssignee', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.jiraAssignee || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Assigne'} />,
            minSize: 50,
            size: 55,
            maxSize: 60,
          }),
          columnHelper.accessor('username', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.username || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Username'} />,
            minSize: 50,
            size: 55,
            maxSize: 60,
          }),
          columnHelper.accessor('jiraSiteUrl', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.jiraSiteUrl || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Url'} />,
            minSize: 50,
            size: 55,
            maxSize: 60,
          }),
        ];
      case IntegrationType.splunk:
        return [
          columnHelper.accessor('endpoint_url', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.endpoint_url || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Endpoint url'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
          columnHelper.accessor('token_masked', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.token_masked || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Token'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
        ];
      case IntegrationType.elasticsearch:
        return [
          columnHelper.accessor('endpoint_url', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.endpoint_url || '-'} />
              ) : (
                '-'
              ),

            header: () => <TruncatedText text={'Endpoint url'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
          columnHelper.accessor('index', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.index || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Index'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
          columnHelper.accessor('auth_header_masked', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.auth_header_masked || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Auth'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
          columnHelper.accessor('docType', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.docType || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Doc type'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
        ];
      case IntegrationType.sumoLogic:
        return [
          columnHelper.accessor('endpoint_url', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.endpoint_url || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Endpoint url'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
        ];
      case IntegrationType.googleChronicle:
        return [
          columnHelper.accessor('url', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.url || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Endpoint url'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
          columnHelper.accessor('auth_header_masked', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.auth_header_masked || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Auth header'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
        ];
      case IntegrationType.awsSecurityHub:
        return [
          columnHelper.accessor('aws_access_key', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.aws_access_key || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Access key'} />,
            minSize: 45,
            size: 60,
            maxSize: 55,
          }),
          columnHelper.accessor('aws_region', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? row.original.config.aws_region : '-',
            minSize: 45,
            size: 60,
            maxSize: 75,
          }),
        ];
      case IntegrationType.microsoftTeams:
        return [
          columnHelper.accessor('webhook_url_masked', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.webhook_url_masked || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Webhook url'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
        ];
      case IntegrationType.pagerDuty:
        return [
          columnHelper.accessor('service_key_masked', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.service_key_masked || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Service key'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
          columnHelper.accessor('api_key_masked', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.api_key_masked || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Api key'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
        ];
      case IntegrationType.httpEndpoint:
        return [
          columnHelper.accessor('url', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.url} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Url'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
          columnHelper.accessor('auth_header_masked', {
            cell: ({ row }) =>
              !isEmpty(row.original.config) ? (
                <TruncatedText text={row.original.config.auth_header_masked || '-'} />
              ) : (
                '-'
              ),
            header: () => <TruncatedText text={'Auth header'} />,
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
        ];
      case IntegrationType.email:
        return [
          columnHelper.display({
            id: 'email_id',
            header: () => <TruncatedText text={'Email id'} />,
            cell: (info) => (
              <TruncatedText text={info.row.original.config?.email_id ?? '-'} />
            ),
            minSize: 45,
            size: 50,
            maxSize: 55,
          }),
        ];
      default:
        console.warn('Dynamic columns valid integration type');
        return [];
    }
  };

  const columns = useMemo(() => {
    const columns = [
      getRowSelectionColumn(columnHelper, {
        minSize: 10,
        size: 15,
        maxSize: 30,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          const id = cell.row.original.id;
          if (!id) {
            throw new Error('Integration id not found');
          }
          return (
            <ActionDropdown
              row={cell.row.original}
              onTableAction={onTableAction}
              trigger={
                <button className="p-1">
                  <div className="h-[16px] w-[16px] text-text-text-and-icon rotate-90">
                    <EllipsisIcon />
                  </div>
                </button>
              }
            />
          );
        },
        header: () => '',
        minSize: 30,
        size: 30,
        maxSize: 35,
        enableResizing: false,
      }),
      columnHelper.accessor('id', {
        cell: (cell) => cell.getValue(),
        header: () => 'ID',
        minSize: 35,
        size: 40,
        maxSize: 45,
      }),

      columnHelper.accessor('integration_type', {
        cell: (cell) => cell.getValue(),
        header: () => 'Integration type',
        minSize: 65,
        size: 70,
        maxSize: 75,
      }),
      columnHelper.accessor('notification_type', {
        cell: (cell) => cell.getValue(),
        header: () => 'Notification type',
        minSize: 65,
        size: 70,
        maxSize: 75,
      }),
      columnHelper.accessor('last_error_msg', {
        cell: (cell) => {
          const isError =
            cell.row.original?.last_error_msg &&
            cell.row.original?.last_error_msg?.trim()?.length > 0;
          return (
            <div className="flex items-center text-text-text-and-icon text-p4">
              {isError ? (
                <Tooltip content={cell.row.original?.last_error_msg}>
                  <div className="flex gap-1.5">
                    <span className="w-[18px] h-[18px] shrink-0 flex text-status-error">
                      <ErrorIcon />
                    </span>
                    Error
                  </div>
                </Tooltip>
              ) : (
                <div className="flex gap-1.5">
                  <span className="w-[18px] h-[18px] shrink-0 flex">
                    <SuccessIcon />
                  </span>
                  Active
                </div>
              )}
            </div>
          );
        },
        header: () => 'Status',
        minSize: 65,
        size: 70,
        maxSize: 75,
      }),
      ...getDynamicTableColumns(),
      columnHelper.display({
        id: 'filters',
        enableSorting: false,
        cell: ({ row }) => {
          const displayFilters: {
            severities?: string[];
            statuses?: string[];
            node_ids?: Array<{ node_id: string; node_type: string }> | null;
            custom_fields?: string[];
            container_names?: string[];
          } = {};
          const filters = row.original.filters;
          const containFilter = filters?.fields_filters?.contains_filter;
          const filterIn = containFilter?.filter_in;
          const notificationType = row.original?.notification_type ?? '';
          const hasSeverityOrStatus = has(filterIn, severityMap[notificationType]);

          if (filters?.node_ids && filters?.node_ids.length) {
            displayFilters.node_ids = filters?.node_ids;
          }

          if (filters?.container_names && filters?.container_names.length) {
            displayFilters.container_names = filters?.container_names;
          }

          if (hasSeverityOrStatus) {
            if (
              notificationType === 'Compliance' ||
              notificationType === 'CloudCompliance'
            ) {
              displayFilters.statuses = filterIn?.[severityMap[notificationType]] ?? [];
            } else {
              displayFilters.severities = filterIn?.[severityMap[notificationType]] ?? [];
            }
          }

          const configs = row.original.config;
          const customFields = configs?.custom_fields;

          if (customFields) {
            displayFilters.custom_fields = customFields;
          }

          if (isEmpty(displayFilters)) {
            return '-';
          }

          return (
            <Tooltip
              content={
                <pre className="text-p7 dark:text-text-input-value text-text-text-inverse max-h-[300px] overflow-auto">
                  {JSON.stringify(displayFilters, null, 2)}
                </pre>
              }
              triggerAsChild
            >
              <div className="w-full truncate">{JSON.stringify(displayFilters)}</div>
            </Tooltip>
          );
        },
        header: () => 'Filter',
        minSize: 65,
        size: 70,
        maxSize: 80,
        enableResizing: true,
      }),
    ];
    return columns;
  }, []);
  return columns;
};
