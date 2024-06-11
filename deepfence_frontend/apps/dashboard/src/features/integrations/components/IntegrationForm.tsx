import { isNil, upperFirst } from 'lodash-es';
import { useState } from 'react';
import { useFetcher, useParams } from 'react-router-dom';
import { useUpdateEffect } from 'react-use';
import {
  Button,
  Checkbox,
  Listbox,
  ListboxOption,
  Radio,
  TextInput,
} from 'ui-components';

import {
  ModelCloudComplianceStatusEnum,
  ModelComplianceStatusEnum,
  ModelIntegrationFilters,
  ModelIntegrationListResp,
  ModelNodeIdentifierNodeTypeEnum,
} from '@/api/generated';
import { SearchableCloudAccountsList } from '@/components/forms/SearchableCloudAccountsList';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableContainerList } from '@/components/forms/SearchableContainerList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { SearchableImageList } from '@/components/forms/SearchableImageList';
import { FieldSelection } from '@/features/integrations/components/report-form/FieldSelection';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { ScanTypeEnum } from '@/types/common';
import { getPostureStatusPrettyName } from '@/utils/enum';

import {
  ActionEnumType,
  severityMap,
  // CLOUD_TRAIL_ALERT,
  // USER_ACTIVITIES,
} from '../pages/IntegrationAdd';

type IntegrationTypeProps = {
  integrationType: string;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
  data?: ModelIntegrationListResp;
};

export const IntegrationType = {
  slack: 'slack',
  pagerDuty: 'pagerduty',
  email: 'email',
  httpEndpoint: 'http_endpoint',
  microsoftTeams: 'teams',
  splunk: 'splunk',
  sumoLogic: 'sumologic',
  elasticsearch: 'elasticsearch',
  googleChronicle: 'googlechronicle',
  awsSecurityHub: 'aws_security_hub',
  jira: 'jira',
  s3: 's3',
} as const;

// const UserActivityIntegration: string[] = [
//   IntegrationType.splunk,
//   IntegrationType.sumoLogic,
//   IntegrationType.elasticsearch,
//   IntegrationType.googleChronicle,
//   IntegrationType.awsSecurityHub,
//   IntegrationType.jira,
//   IntegrationType.s3,
// ];

// const CloudTrailIntegration: string[] = [
//   IntegrationType.slack,
//   IntegrationType.pagerDuty,
//   IntegrationType.email,
//   IntegrationType.httpEndpoint,
//   IntegrationType.microsoftTeams,
//   IntegrationType.splunk,
//   IntegrationType.sumoLogic,
//   IntegrationType.elasticsearch,
//   IntegrationType.googleChronicle,
//   IntegrationType.awsSecurityHub,
// ];

const TextInputType = ({
  label,
  name,
  value,
  helperText,
  color,
  type,
  placeholder,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  value?: string;
  helperText: string;
  color: 'error' | 'default';
  type?: 'text' | 'password';
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) => {
  return (
    <TextInput
      className="w-full"
      label={label}
      type={type ?? 'text'}
      name={name}
      placeholder={placeholder ? placeholder : label}
      helperText={helperText}
      color={color}
      required={required}
      value={value}
      defaultValue={defaultValue}
    />
  );
};

const isCloudTrailNotification = (notificationType: string) => {
  return notificationType && notificationType === 'CloudTrailAlert';
};

const isUserActivityNotification = (notificationType: string) => {
  return notificationType && notificationType === 'UserActivities';
};

const isVulnerabilityNotification = (notificationType: string) => {
  return notificationType && notificationType === 'Vulnerability';
};

const isJiraIntegration = (integrationType: string) => {
  return integrationType && integrationType === IntegrationType.jira;
};

const isCloudComplianceNotification = (notificationType: string) => {
  return notificationType && notificationType === 'CloudCompliance';
};

const isComplianceNotification = (notificationType: string) => {
  return notificationType && notificationType === 'Compliance';
};

const getHostsFilter = (nodeIds: ModelIntegrationFilters['node_ids'] = []) => {
  if (!nodeIds) {
    return [];
  }
  return nodeIds.reduce((acc: string[], current) => {
    if (current.node_type === ModelNodeIdentifierNodeTypeEnum.Host) {
      acc.push(current.node_id);
    }
    return acc;
  }, []);
};

const getImagesFilter = (nodeIds: ModelIntegrationFilters['node_ids'] = []) => {
  if (!nodeIds) {
    return [];
  }
  return nodeIds.reduce((acc: string[], current) => {
    if (current.node_type === ModelNodeIdentifierNodeTypeEnum.Image) {
      acc.push(current.node_id);
    }
    return acc;
  }, []);
};

const getClustersFilter = (nodeIds: ModelIntegrationFilters['node_ids'] = []) => {
  if (!nodeIds) {
    return [];
  }
  return nodeIds.reduce((acc: string[], current) => {
    if (current.node_type === ModelNodeIdentifierNodeTypeEnum.Cluster) {
      acc.push(current.node_id);
    }
    return acc;
  }, []);
};

const getCloudAccountsFilter = (nodeIds: ModelIntegrationFilters['node_ids'] = []) => {
  if (!nodeIds) {
    return [];
  }
  return nodeIds.reduce((acc: string[], current) => {
    if (current.node_type === ModelNodeIdentifierNodeTypeEnum.CloudAccount) {
      acc.push(current.node_id);
    }
    return acc;
  }, []);
};

const API_SCAN_TYPE_MAP: {
  [key: string]: ScanTypeEnum;
} = {
  Vulnerability: ScanTypeEnum.VulnerabilityScan,
  Secret: ScanTypeEnum.SecretScan,
  Malware: ScanTypeEnum.MalwareScan,
  Compliance: ScanTypeEnum.ComplianceScan,
};

const scanTypes = ['Secret', 'Vulnerability', 'Malware'];
const AdvancedFilters = ({
  notificationType,
  cloudProvider,
  filters,
}: {
  notificationType: string;
  cloudProvider?: string;
  filters?: ModelIntegrationFilters;
}) => {
  const fieldFilters = filters?.fields_filters;
  // severity
  const severityFilter =
    fieldFilters?.contains_filter?.filter_in?.[
      severityMap[notificationType ?? ''] || 'severity'
    ];
  // status for compliance
  const statusFilter = fieldFilters?.contains_filter?.filter_in?.['status'];

  const [selectedSeverity, setSelectedSeverity] = useState<string[]>(
    severityFilter?.map((severity) => upperFirst(severity)) ?? [],
  );

  // status
  const [selectedStatus, setSelectedStatus] = useState<string[]>(
    statusFilter?.map((status) => upperFirst(status)) ?? [],
  );

  // to main clear state for combobox
  const [hosts, setHosts] = useState<string[]>(getHostsFilter(filters?.node_ids));
  const [images, setImages] = useState<string[]>(getImagesFilter(filters?.node_ids));
  const [containers, setContainers] = useState<string[]>(filters?.container_names ?? []);
  const [clusters, setClusters] = useState<string[]>(
    getClustersFilter(filters?.node_ids),
  );
  const [selectedCloudAccounts, setSelectedCloudAccounts] = useState<string[]>(
    getCloudAccountsFilter(filters?.node_ids),
  );

  useUpdateEffect(() => {
    setSelectedSeverity([]);
    setSelectedStatus([]);
    setHosts([]);
    setImages([]);
    setContainers([]);
    setClusters([]);
    setSelectedCloudAccounts([]);
  }, [notificationType, cloudProvider]);

  return (
    <div className="col-span-2 mt-6">
      <div className="flex text-text-input-value ">
        <div className="text-h5">Advanced Filter (Optional)</div>
      </div>
      <div className="grid grid-cols-2 gap-y-8 gap-x-8 pt-4">
        {isCloudComplianceNotification(notificationType) && cloudProvider ? (
          <SearchableCloudAccountsList
            label={`${cloudProvider} Account`}
            triggerVariant="select"
            defaultSelectedAccounts={selectedCloudAccounts}
            cloudProvider={cloudProvider.toLowerCase() as 'aws' | 'gcp' | 'azure'}
            onClearAll={() => {
              setSelectedCloudAccounts([]);
            }}
            onChange={(value) => {
              setSelectedCloudAccounts(value);
            }}
          />
        ) : (
          <SearchableHostList
            scanType={API_SCAN_TYPE_MAP[notificationType]}
            triggerVariant="select"
            defaultSelectedHosts={hosts}
            onChange={(value) => {
              setHosts(value);
            }}
            onClearAll={() => {
              setHosts([]);
            }}
            agentRunning={false}
            active={false}
          />
        )}
        {!isComplianceNotification(notificationType) &&
          !isCloudComplianceNotification(notificationType) && (
            <SearchableContainerList
              scanType={API_SCAN_TYPE_MAP[notificationType]}
              triggerVariant="select"
              defaultSelectedContainers={containers}
              onChange={(value) => {
                setContainers(value);
              }}
              onClearAll={() => {
                setContainers([]);
              }}
              active={false}
              valueKey="nodeName"
            />
          )}
        {!isComplianceNotification(notificationType) &&
          !isCloudComplianceNotification(notificationType) && (
            <SearchableImageList
              scanType={API_SCAN_TYPE_MAP[notificationType]}
              triggerVariant="select"
              defaultSelectedImages={images}
              onChange={(value) => {
                setImages(value);
              }}
              onClearAll={() => {
                setImages([]);
              }}
            />
          )}
        {!isCloudComplianceNotification(notificationType) && (
          <SearchableClusterList
            triggerVariant="select"
            defaultSelectedClusters={clusters}
            onChange={(value) => {
              setClusters(value);
            }}
            onClearAll={() => {
              setClusters([]);
            }}
            agentRunning={false}
            active={false}
          />
        )}

        {isComplianceNotification(notificationType) ||
        isCloudComplianceNotification(notificationType) ? (
          <>
            {isComplianceNotification(notificationType) && (
              <Listbox
                variant="underline"
                value={selectedStatus}
                name="statusFilter"
                onChange={(value) => {
                  setSelectedStatus(value);
                }}
                placeholder="Select status"
                label="Select status"
                multiple
                clearAll="Clear"
                onClearAll={() => setSelectedStatus([])}
                getDisplayValue={(value) => {
                  return value && value.length ? `${value.length} selected` : '';
                }}
              >
                <div className="px-3 pt-2 text-p3 text-text-text-and-icon">Host</div>
                <ListboxOption value={ModelComplianceStatusEnum.Pass}>
                  {getPostureStatusPrettyName(ModelComplianceStatusEnum.Pass)}
                </ListboxOption>
                <ListboxOption value={ModelComplianceStatusEnum.Warn}>
                  {getPostureStatusPrettyName(ModelComplianceStatusEnum.Warn)}
                </ListboxOption>
                <ListboxOption value={ModelComplianceStatusEnum.Note}>
                  {getPostureStatusPrettyName(ModelComplianceStatusEnum.Note)}
                </ListboxOption>
                <div className="px-3 pt-4 text-p3 text-text-text-and-icon">
                  Kubernetes
                </div>
                <ListboxOption value={ModelCloudComplianceStatusEnum.Alarm}>
                  {getPostureStatusPrettyName(ModelCloudComplianceStatusEnum.Alarm)}
                </ListboxOption>
                <ListboxOption value={ModelCloudComplianceStatusEnum.Ok}>
                  {getPostureStatusPrettyName(ModelCloudComplianceStatusEnum.Ok)}
                </ListboxOption>
                <ListboxOption value={ModelCloudComplianceStatusEnum.Skip}>
                  {getPostureStatusPrettyName(ModelCloudComplianceStatusEnum.Skip)}
                </ListboxOption>
                <ListboxOption value={ModelCloudComplianceStatusEnum.Delete}>
                  {getPostureStatusPrettyName(ModelCloudComplianceStatusEnum.Delete)}
                </ListboxOption>
                <div className="px-3 pt-4 text-p3 text-text-text-and-icon">Common</div>
                <ListboxOption value={ModelCloudComplianceStatusEnum.Info}>
                  {getPostureStatusPrettyName(ModelCloudComplianceStatusEnum.Info)}
                </ListboxOption>
              </Listbox>
            )}
            {isCloudComplianceNotification(notificationType) && (
              <Listbox
                variant="underline"
                value={selectedStatus}
                name="statusFilter"
                onChange={(value) => {
                  setSelectedStatus(value);
                }}
                placeholder="Select status"
                label="Select status"
                multiple
                clearAll="Clear"
                onClearAll={() => setSelectedStatus([])}
                getDisplayValue={(value) => {
                  return value && value.length ? `${value.length} selected` : '';
                }}
              >
                {Object.values(ModelCloudComplianceStatusEnum).map((status) => {
                  return (
                    <ListboxOption key={status} value={status}>
                      {getPostureStatusPrettyName(status)}
                    </ListboxOption>
                  );
                })}
              </Listbox>
            )}
          </>
        ) : null}

        {scanTypes.includes(notificationType as ScanTypeEnum) ? (
          <>
            <Listbox
              variant="underline"
              value={selectedSeverity}
              name="severityFilter"
              onChange={(value) => {
                setSelectedSeverity(value);
              }}
              placeholder="Select severity"
              label="Select severity"
              multiple
              clearAll="Clear"
              onClearAll={() => setSelectedSeverity([])}
              getDisplayValue={(value) => {
                return value && value.length ? `${value.length} selected` : '';
              }}
            >
              <ListboxOption value={'Critical'}>Critical</ListboxOption>
              <ListboxOption value={'High'}>High</ListboxOption>
              <ListboxOption value={'Medium'}>Medium</ListboxOption>
              <ListboxOption value={'Low'}>Low</ListboxOption>
            </Listbox>
          </>
        ) : null}
      </div>
    </div>
  );
};

const getDisplayNotification = (notificationType: string) => {
  if (isCloudTrailNotification(notificationType)) {
    return 'CloudTrail Alert';
  } else if (isUserActivityNotification(notificationType)) {
    return 'User Activities';
  } else if (isCloudComplianceNotification(notificationType)) {
    return 'Cloud Compliance';
  }
  return notificationType;
};
const NotificationType = ({
  fieldErrors,
  defaultNotificationType,
  data,
}: {
  fieldErrors?: Record<string, string>;
  defaultNotificationType: string;
  data?: ModelIntegrationListResp;
}) => {
  const [notificationType, setNotificationType] = useState<ScanTypeEnum | string>(
    defaultNotificationType,
  );
  const [cloud, setCloud] = useState<string>('AWS');

  const { integrationType } = useParams() as {
    integrationType: string;
  };

  if (!integrationType) {
    console.warn('Notification Type is required to get scan resource type');
    return null;
  }

  return (
    <>
      <Listbox
        variant="underline"
        value={notificationType}
        name="_notificationType"
        onChange={(value) => {
          if (value === 'CloudTrail Alert') {
            setNotificationType('CloudTrail Alert');
          } else {
            setNotificationType(value);
          }
        }}
        placeholder="Select notification type"
        label="Notification Type"
        getDisplayValue={() => {
          return getDisplayNotification(notificationType);
        }}
        required
      >
        {['Vulnerability', 'Secret', 'Malware', 'Compliance', 'CloudCompliance'].map(
          (notification) => {
            return (
              <ListboxOption key={notification} value={notification}>
                {getDisplayNotification(notification)}
              </ListboxOption>
            );
          },
        )}

        {/* {CloudTrailIntegration.includes(integrationType) && (
          <SelectItem value={CLOUD_TRAIL_ALERT}>CloudTrail Alert</SelectItem>
        )} */}

        {/* {UserActivityIntegration.includes(integrationType) ? (
          <SelectItem value={USER_ACTIVITIES}>User Activities</SelectItem>
        ) : null} */}
      </Listbox>

      {isCloudComplianceNotification(notificationType) &&
        integrationType !== IntegrationType.s3 && (
          <Listbox
            variant="underline"
            label="Select Provider"
            value={cloud}
            name="cloudType"
            onChange={(value) => {
              setCloud(value);
            }}
            placeholder="Select provider"
            getDisplayValue={() => {
              return cloud;
            }}
          >
            {['AWS', 'GCP', 'AZURE'].map((cloud) => {
              return (
                <ListboxOption value={cloud} key={cloud}>
                  {cloud}
                </ListboxOption>
              );
            })}
          </Listbox>
        )}

      {isCloudTrailNotification(notificationType) && <>Add Cloud trails here</>}

      {/**  TODO: check this is used */}
      {isUserActivityNotification(notificationType) && (
        <div className="mt-3">
          <TextInputType
            name="interval"
            label="Enter interval"
            helperText={fieldErrors?.interval ?? ''}
            color={fieldErrors?.interval ? 'error' : 'default'}
          />
        </div>
      )}

      {notificationType &&
      !isCloudTrailNotification(notificationType) &&
      !isUserActivityNotification(notificationType) ? (
        <AdvancedFilters
          notificationType={notificationType}
          cloudProvider={cloud}
          filters={data?.filters}
        />
      ) : null}

      {notificationType &&
      isVulnerabilityNotification(notificationType) &&
      isJiraIntegration(integrationType) ? (
        <FieldSelection
          notificationType={notificationType.toLowerCase() as 'vulnerability'}
          defaultSelectedFields={data?.config?.custom_fields}
        />
      ) : null}
    </>
  );
};

export const IntegrationForm = ({
  integrationType,
  setOpenModal,
  data: formData,
}: IntegrationTypeProps) => {
  const fetcher = useFetcher<{
    message: string;
    success: boolean;
    fieldErrors?: Record<string, string>;
  }>();
  const { data } = fetcher;
  const fieldErrors = data?.fieldErrors ?? {};

  // for jira
  const [authType, setAuthType] = useState(() => {
    return formData?.config?.isAuthToken ? 'apiToken' : 'password';
  });

  // for aws security hub
  const [awsAccounts, setAccounts] = useState<string[]>(() => {
    return formData?.config?.aws_account_id ?? [];
  });

  // for s3
  const [useIAMRole, setUseIAMRole] = useState<boolean>(() => {
    return formData?.config?.use_iam_role === 'true';
  });

  return (
    <>
      {!data?.success ? (
        <fetcher.Form method="post" className="m-4 overflow-y-auto">
          <input type="text" name="integrationId" hidden readOnly value={formData?.id} />
          <div className="grid grid-cols-2 relative gap-y-8 gap-x-8">
            {integrationType === IntegrationType.slack && (
              <>
                <TextInputType
                  name="url"
                  label="Webhook Url"
                  placeholder="Slack webhook url"
                  helperText={
                    fieldErrors?.webhook_url ??
                    'Ex. https://hooks.slack.com/services/T0000/B00000/XXXXXXXXX'
                  }
                  color={fieldErrors?.webhook_url ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.channel}
                  name="channelName"
                  label="Channel Name"
                  placeholder="Slack channel"
                  helperText={fieldErrors?.channel}
                  color={fieldErrors?.channel ? 'error' : 'default'}
                  required
                />
              </>
            )}
            {integrationType === IntegrationType.pagerDuty && (
              <>
                <TextInputType
                  name="integrationKey"
                  label="Integration Key"
                  placeholder="Integration key"
                  helperText={fieldErrors?.service_key}
                  color={fieldErrors?.service_key ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  name="apiKey"
                  label="Api Key"
                  placeholder="Api key"
                  helperText={fieldErrors?.api_key}
                  color={fieldErrors?.api_key ? 'error' : 'default'}
                  required
                />
              </>
            )}
            {integrationType === IntegrationType.email && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.email_id}
                  name="email"
                  label="Email Id"
                  placeholder="Email id"
                  helperText={fieldErrors?.email_id}
                  color={fieldErrors?.email_id ? 'error' : 'default'}
                  required
                />
              </>
            )}
            {integrationType === IntegrationType.httpEndpoint && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.url}
                  name="apiUrl"
                  label="API Url"
                  placeholder="API url"
                  helperText={fieldErrors?.url}
                  color={fieldErrors?.url ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  name="auth_header"
                  label="Authorization Header"
                  placeholder="Authorization header"
                  helperText={fieldErrors?.auth_key}
                  color={fieldErrors?.auth_key ? 'error' : 'default'}
                />
              </>
            )}
            {integrationType === IntegrationType.microsoftTeams && (
              <>
                <TextInputType
                  name="url"
                  label="Webhook Url"
                  placeholder="Webhook url"
                  helperText={
                    fieldErrors?.webhook_url ??
                    'Ex. https://myteam.webhook.office.com/webhookb2/a1b1c1d1/XXX/XXXX'
                  }
                  color={fieldErrors?.webhook_url ? 'error' : 'default'}
                  required
                />
              </>
            )}

            {integrationType === IntegrationType.splunk && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.endpoint_url}
                  name="url"
                  label="Endpoint Url"
                  placeholder="Endpoint url"
                  helperText={
                    fieldErrors?.endpoint_url ??
                    'Ex. https://[splunkEndpoint]:8089/services/receivers/simpleVersion: 7.1'
                  }
                  color={fieldErrors?.endpoint_url ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  name="token"
                  label="Receiver Token"
                  placeholder="Receiver token"
                  helperText={fieldErrors?.token}
                  color={fieldErrors?.token ? 'error' : 'default'}
                  required
                />
              </>
            )}

            {integrationType === IntegrationType.sumoLogic && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.endpoint_url}
                  name="url"
                  label="Endpoint Url"
                  placeholder="Endpoint url"
                  helperText={
                    fieldErrors?.http_endpoint ??
                    'Ex. https://[SumoEndpoint]/receiver/v1/http/[UniqueHTTPCollectorCode]'
                  }
                  color={fieldErrors?.http_endpoint ? 'error' : 'default'}
                  required
                />
              </>
            )}

            {integrationType === IntegrationType.elasticsearch && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.endpoint_url}
                  name="url"
                  label="Endpoint Url"
                  placeholder="Elasticsearch endpoint url"
                  helperText={fieldErrors?.endpoint_url ?? 'Version: 5.x and above'}
                  color={fieldErrors?.endpoint_url ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.index}
                  name="index"
                  label="Index"
                  placeholder="Elasticsearch index"
                  helperText={fieldErrors?.index}
                  color={fieldErrors?.index ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.docType}
                  name="docType"
                  label="Doc Type"
                  placeholder="Elasticsearch doc type"
                  helperText={fieldErrors?.doc_type}
                  color={fieldErrors?.doc_type ? 'error' : 'default'}
                />
                <TextInputType
                  defaultValue={formData?.config?.auth_header}
                  name="authKey"
                  label="Auth Key"
                  placeholder="Auth key"
                  helperText={fieldErrors?.auth_key}
                  color={fieldErrors?.auth_key ? 'error' : 'default'}
                />
              </>
            )}

            {integrationType === IntegrationType.googleChronicle && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.url}
                  name="url"
                  label="API Url"
                  placeholder="Api url"
                  helperText={fieldErrors?.url}
                  color={fieldErrors?.url ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.auth_header}
                  name="authKey"
                  label="Auth Key"
                  placeholder="Auth key"
                  helperText={fieldErrors?.auth_key}
                  color={fieldErrors?.auth_key ? 'error' : 'default'}
                />
              </>
            )}

            {integrationType === IntegrationType.awsSecurityHub && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.aws_access_key}
                  name="accessKey"
                  required
                  label="Access Key"
                  placeholder="AWS access key"
                  helperText={fieldErrors?.aws_access_key}
                  color={fieldErrors?.aws_access_key ? 'error' : 'default'}
                />
                <TextInputType
                  name="secretKey"
                  label="Secret Key"
                  required
                  placeholder="AWS secret key"
                  helperText={fieldErrors?.aws_secret_key}
                  color={fieldErrors?.aws_secret_key ? 'error' : 'default'}
                  type="password"
                />
                <TextInputType
                  defaultValue={formData?.config?.aws_region}
                  name="region"
                  required
                  label="Region"
                  placeholder="AWS region"
                  helperText={fieldErrors?.aws_region}
                  color={fieldErrors?.aws_region ? 'error' : 'default'}
                />
                <SearchableCloudAccountsList
                  label="AWS Account"
                  triggerVariant="select"
                  defaultSelectedAccounts={awsAccounts}
                  cloudProvider="aws"
                  valueKey="nodeName"
                  onClearAll={() => {
                    setAccounts([]);
                  }}
                  onChange={(value) => {
                    setAccounts(value);
                  }}
                  helperText={fieldErrors?.aws_account_id}
                  color={fieldErrors?.aws_account_id ? 'error' : 'default'}
                />
              </>
            )}

            {integrationType === IntegrationType.jira && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.jiraSiteUrl}
                  name="url"
                  label="Jira Url"
                  placeholder="Jira site url"
                  helperText={
                    fieldErrors?.jira_site_url ??
                    'Ex. https://[organization].atlassian.net/Version: 7.13'
                  }
                  color={fieldErrors?.jira_site_url ? 'error' : 'default'}
                  required
                />
                <Radio
                  name="authTypeRadio"
                  direction="row"
                  value={authType}
                  options={[
                    {
                      label: 'API Token',
                      value: 'apiToken',
                    },
                    {
                      label: 'Password',
                      value: 'password',
                    },
                  ]}
                  onValueChange={(value) => {
                    setAuthType(value);
                  }}
                />
                <TextInputType
                  name="authType"
                  label={authType === 'password' ? 'Password' : 'Api Token'}
                  helperText={
                    authType === 'password'
                      ? fieldErrors?.password
                      : fieldErrors?.api_token
                  }
                  color={
                    fieldErrors?.password || fieldErrors?.api_token ? 'error' : 'default'
                  }
                  type={authType === 'password' ? 'password' : 'text'}
                  placeholder={authType === 'password' ? 'password' : 'Api token'}
                  key={authType}
                />
                <TextInputType
                  defaultValue={formData?.config?.username}
                  name="email"
                  label="Email"
                  helperText={fieldErrors?.username}
                  color={fieldErrors?.username ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.jiraProjectKey}
                  name="accessKey"
                  label="Project Key"
                  placeholder="Jira project key"
                  helperText={fieldErrors?.jira_project_key}
                  color={fieldErrors?.jira_project_key ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.issueType}
                  name="task"
                  label="Task Name"
                  placeholder="Bugs, task, etc"
                  helperText={fieldErrors?.issue_type ?? 'Case sensitive'}
                  color={fieldErrors?.issue_type ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.jiraAssignee}
                  name="assigne"
                  label="Assignee"
                  placeholder="Jira assigne"
                  helperText={fieldErrors?.jira_assignee}
                  color={fieldErrors?.jira_assignee ? 'error' : 'default'}
                />
              </>
            )}

            {integrationType === IntegrationType.s3 && (
              <>
                <TextInputType
                  defaultValue={formData?.config?.s3_bucket_name}
                  name="name"
                  label="Bucket Name"
                  placeholder="S3 bucket name"
                  helperText={fieldErrors?.s3_bucket_name}
                  color={fieldErrors?.s3_bucket_name ? 'error' : 'default'}
                  required
                />
                <TextInputType
                  defaultValue={formData?.config?.s3_folder_name}
                  name="folder"
                  label={'Folder'}
                  placeholder="S3 folder"
                  helperText={fieldErrors?.s3_folder_name}
                  color={fieldErrors?.s3_folder_name ? 'error' : 'default'}
                  required
                />
                <TextInput
                  defaultValue={formData?.config?.aws_account_id}
                  name="awsAccount"
                  label="AWS Account ID"
                  placeholder="AWS account id"
                  required
                  info="S3 belonging to other AWS Accounts"
                  helperText={fieldErrors?.aws_account_id}
                  color={fieldErrors?.aws_account_id ? 'error' : 'default'}
                />
                <TextInputType
                  defaultValue={formData?.config?.aws_region}
                  name="region"
                  label="Region"
                  placeholder="AWS region"
                  helperText={fieldErrors?.aws_region}
                  color={fieldErrors?.aws_region ? 'error' : 'default'}
                  required
                />
                <div className="col-span-2">
                  <Checkbox
                    label="Use AWS IAM Role"
                    key="useIAMRole"
                    name="useIAMRole"
                    checked={useIAMRole}
                    onCheckedChange={(checked: boolean) => {
                      setUseIAMRole(checked);
                    }}
                  />
                </div>
                {useIAMRole ? (
                  <TextInput
                    defaultValue={formData?.config?.target_account_role_arn}
                    name="awsARN"
                    label="Target Account Role ARN"
                    placeholder="Target account role arn"
                    info="S3 belonging to other AWS Accounts"
                    helperText={fieldErrors?.target_account_role_arn}
                    color={fieldErrors?.target_account_role_arn ? 'error' : 'default'}
                  />
                ) : (
                  <>
                    <TextInputType
                      defaultValue={formData?.config?.aws_access_key}
                      name="accessKey"
                      label="Access Key"
                      placeholder="AWS access key"
                      helperText={fieldErrors?.aws_access_key}
                      color={fieldErrors?.aws_access_key ? 'error' : 'default'}
                    />
                    <TextInputType
                      name="secretKey"
                      label="Secret Key"
                      placeholder="AWS secret key"
                      helperText={fieldErrors?.aws_secret_key}
                      color={fieldErrors?.aws_secret_key ? 'error' : 'default'}
                    />
                  </>
                )}
              </>
            )}

            <NotificationType
              defaultNotificationType={formData?.notification_type ?? ''}
              data={formData}
            />

            <input
              type="text"
              name="_actionType"
              readOnly
              hidden
              value={isNil(formData) ? ActionEnumType.ADD : ActionEnumType.EDIT}
            />
            {data?.message && <p className="text-status-error text-p7">{data.message}</p>}
          </div>
          <div className="mt-14 flex gap-x-2 p-1">
            <Button
              size="md"
              color="default"
              type="submit"
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
            >
              {isNil(formData) ? 'Add' : 'Update'}
            </Button>
            <Button
              type="button"
              size="md"
              color="default"
              variant="outline"
              onClick={() => setOpenModal(false)}
            >
              Cancel
            </Button>
          </div>
        </fetcher.Form>
      ) : (
        <SuccessModalContent text={`${formData ? 'Updated' : 'Added'} successfully`} />
      )}
    </>
  );
};
