import { useState } from 'react';
import { useFetcher, useParams } from 'react-router-dom';
import { Button, Listbox, ListboxOption, Radio, TextInput } from 'ui-components';

import { SearchableCloudAccountsList } from '@/components/forms/SearchableCloudAccountsList';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableContainerList } from '@/components/forms/SearchableContainerList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { SearchableImageList } from '@/components/forms/SearchableImageList';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { ScanTypeEnum } from '@/types/common';

import {
  ActionEnumType,
  // CLOUD_TRAIL_ALERT,
  // USER_ACTIVITIES,
} from '../pages/IntegrationAdd';

type IntegrationTypeProps = {
  integrationType: string;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
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
  helperText,
  color,
}: {
  label: string;
  name: string;
  helperText: string;
  color: 'error' | 'default';
}) => {
  return (
    <TextInput
      className="w-full"
      label={label}
      type={'text'}
      name={name}
      placeholder={label}
      helperText={helperText}
      color={color}
    />
  );
};

const isCloudTrailNotification = (notificationType: string) => {
  return notificationType && notificationType === 'CloudTrail Alert';
};

const isUserActivityNotification = (notificationType: string) => {
  return notificationType && notificationType === 'User Activities';
};

const isTicketingIntegration = (integrationType: string) => {
  return integrationType && integrationType === IntegrationType.jira;
};

const isArchivalIntegration = (integrationType: string) => {
  return integrationType && integrationType === IntegrationType.s3;
};

const API_SCAN_TYPE_MAP: {
  [key: string]: ScanTypeEnum;
} = {
  Vulnerability: ScanTypeEnum.VulnerabilityScan,
  Secret: ScanTypeEnum.SecretScan,
  Malware: ScanTypeEnum.MalwareScan,
  Compliance: ScanTypeEnum.ComplianceScan,
};
const AdvancedFilters = ({ notificationType }: { notificationType: string }) => {
  // severity
  const [selectedSeverity, setSelectedSeverity] = useState([]);

  // status
  const [selectedStatus, setSelectedStatus] = useState([]);

  return (
    <div className="col-span-2 mt-6">
      <div className="flex dark:text-text-input-value ">
        <div className="text-h5">Advanced Filter (Optional)</div>
      </div>
      <div className="grid grid-cols-2 gap-y-8 gap-x-8 pt-4">
        <SearchableHostList
          scanType={API_SCAN_TYPE_MAP[notificationType]}
          triggerVariant="select"
        />

        <SearchableContainerList
          scanType={API_SCAN_TYPE_MAP[notificationType]}
          triggerVariant="select"
        />
        <SearchableImageList
          scanType={API_SCAN_TYPE_MAP[notificationType]}
          triggerVariant="select"
        />

        <SearchableClusterList triggerVariant="select" />

        {notificationType === 'Compliance' || notificationType === 'CloudCompliance' ? (
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
            clearAll="Clear all"
            onClearAll={() => setSelectedStatus([])}
          >
            <ListboxOption value={'Alarm'}>Alarm</ListboxOption>
            <ListboxOption value={'Info'}>Info</ListboxOption>
            <ListboxOption value={'Ok'}>Ok</ListboxOption>
            <ListboxOption value={'Skip'}>Skip</ListboxOption>
          </Listbox>
        ) : null}

        {['Secret', 'Vulnerability', 'Malware'].includes(
          notificationType as ScanTypeEnum,
        ) ? (
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
            clearAll="Clear all"
            onClearAll={() => setSelectedSeverity([])}
          >
            <ListboxOption value={'Critical'}>Critical</ListboxOption>
            <ListboxOption value={'High'}>High</ListboxOption>
            <ListboxOption value={'Medium'}>Medium</ListboxOption>
            <ListboxOption value={'Low'}>Low</ListboxOption>
          </Listbox>
        ) : null}
      </div>
    </div>
  );
};

const NotificationType = ({ fieldErrors }: { fieldErrors?: Record<string, string> }) => {
  const [notificationType, setNotificationType] = useState<ScanTypeEnum | string>('');

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
        label="Select notification type"
        getDisplayValue={(item) => {
          return (
            ['Vulnerability', 'Secret', 'Malware', 'Compliance'].find(
              (person) => person === item,
            ) ?? ''
          );
        }}
      >
        <ListboxOption value={'Vulnerability'}>Vulnerability</ListboxOption>
        <ListboxOption value={'Secret'}>Secret</ListboxOption>
        <ListboxOption value={'Malware'}>Malware</ListboxOption>
        <ListboxOption value={'Compliance'}>Posture</ListboxOption>

        {/* {CloudTrailIntegration.includes(integrationType) && (
          <SelectItem value={CLOUD_TRAIL_ALERT}>CloudTrail Alert</SelectItem>
        )} */}

        {/* {UserActivityIntegration.includes(integrationType) ? (
          <SelectItem value={USER_ACTIVITIES}>User Activities</SelectItem>
        ) : null} */}
      </Listbox>

      {isCloudTrailNotification(notificationType) && <>Add Cloud trails here</>}

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
      !isUserActivityNotification(notificationType) &&
      !isTicketingIntegration(integrationType) &&
      !isArchivalIntegration(integrationType) ? (
        <AdvancedFilters notificationType={notificationType} />
      ) : null}
    </>
  );
};

export const IntegrationForm = ({
  integrationType,
  setOpenModal,
}: IntegrationTypeProps) => {
  const fetcher = useFetcher<{
    message: string;
    fieldErrors?: Record<string, string>;
  }>();
  const { data } = fetcher;
  const fieldErrors = data?.fieldErrors ?? {};

  // for jira
  const [authType, setAuthType] = useState('apiToken');

  // for aws security hub
  const [awsAccounts, setAccounts] = useState<string[]>([]);

  return (
    <fetcher.Form method="post" className="m-4 overflow-y-auto">
      <div className="grid grid-cols-2 relative gap-y-8 gap-x-8">
        {integrationType === IntegrationType.slack && (
          <>
            <TextInputType
              name="url"
              label="Webhook Url"
              helperText={fieldErrors?.webhook_url}
              color={fieldErrors?.webhook_url ? 'error' : 'default'}
            />
            <TextInputType
              name="channelName"
              label="Channel Name"
              helperText={fieldErrors?.channel}
              color={fieldErrors?.channel ? 'error' : 'default'}
            />
          </>
        )}
        {integrationType === IntegrationType.pagerDuty && (
          <>
            <TextInputType
              name="integrationKey"
              label="Integration key"
              helperText={fieldErrors?.service_key}
              color={fieldErrors?.service_key ? 'error' : 'default'}
            />
            <TextInputType
              name="apiKey"
              label="Api key"
              helperText={fieldErrors?.api_key}
              color={fieldErrors?.api_key ? 'error' : 'default'}
            />
          </>
        )}
        {integrationType === IntegrationType.email && (
          <>
            <TextInputType
              name="email"
              label="Email id"
              helperText={fieldErrors?.email_id}
              color={fieldErrors?.email_id ? 'error' : 'default'}
            />
          </>
        )}
        {integrationType === IntegrationType.httpEndpoint && (
          <>
            <TextInputType
              name="apiUrl"
              label="API url"
              helperText={fieldErrors?.url}
              color={fieldErrors?.url ? 'error' : 'default'}
            />
            <TextInputType
              name="authorizationKey"
              label="Authorization key"
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
              helperText={fieldErrors?.webhook_url}
              color={fieldErrors?.webhook_url ? 'error' : 'default'}
            />
          </>
        )}

        {integrationType === IntegrationType.splunk && (
          <>
            <TextInputType
              name="url"
              label="Endpoint Url"
              helperText={fieldErrors?.url}
              color={fieldErrors?.url ? 'error' : 'default'}
            />
            <TextInputType
              name="token"
              label="Receiver Token"
              helperText={fieldErrors?.token}
              color={fieldErrors?.token ? 'error' : 'default'}
            />
          </>
        )}

        {integrationType === IntegrationType.sumoLogic && (
          <>
            <TextInputType
              name="url"
              label="Endpoint Url"
              helperText={fieldErrors?.url}
              color={fieldErrors?.url ? 'error' : 'default'}
            />
          </>
        )}

        {integrationType === IntegrationType.elasticsearch && (
          <>
            <TextInputType
              name="url"
              label="Endpoint Url"
              helperText={fieldErrors?.url}
              color={fieldErrors?.url ? 'error' : 'default'}
            />
            <TextInputType
              name="index"
              label="Index"
              helperText={fieldErrors?.index}
              color={fieldErrors?.index ? 'error' : 'default'}
            />
            <TextInputType
              name="docType"
              label="Doc Type"
              helperText={fieldErrors?.doc_type}
              color={fieldErrors?.doc_type ? 'error' : 'default'}
            />
            <TextInputType
              name="authKey"
              label="Auth Key"
              helperText={fieldErrors?.auth_key}
              color={fieldErrors?.auth_key ? 'error' : 'default'}
            />
          </>
        )}

        {integrationType === IntegrationType.googleChronicle && (
          <>
            <TextInputType
              name="url"
              label="Api Url"
              helperText={fieldErrors?.url}
              color={fieldErrors?.url ? 'error' : 'default'}
            />
            <TextInputType
              name="authKey"
              label="Auth Key"
              helperText={fieldErrors?.auth_key}
              color={fieldErrors?.auth_key ? 'error' : 'default'}
            />
          </>
        )}

        {integrationType === IntegrationType.awsSecurityHub && (
          <>
            <TextInputType
              name="accessKey"
              label="Access Key"
              helperText={fieldErrors?.aws_access_key}
              color={fieldErrors?.aws_access_key ? 'error' : 'default'}
            />
            <TextInputType
              name="secretKey"
              label="Secret Key"
              helperText={fieldErrors?.aws_secret_key}
              color={fieldErrors?.aws_secret_key ? 'error' : 'default'}
            />
            <TextInputType
              name="region"
              label="Region"
              helperText={fieldErrors?.aws_region}
              color={fieldErrors?.aws_region ? 'error' : 'default'}
            />
            <SearchableCloudAccountsList
              triggerVariant="select"
              defaultSelectedAccounts={awsAccounts}
              cloudProvider="aws"
              onClearAll={() => {
                setAccounts([]);
              }}
              onChange={(value) => {
                setAccounts(value);
              }}
            />
          </>
        )}

        {integrationType === IntegrationType.jira && (
          <>
            <TextInputType
              name="url"
              label="Endpoint Url"
              helperText={fieldErrors?.url}
              color={fieldErrors?.url ? 'error' : 'default'}
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
              label={authType === 'password' ? 'Password' : 'Token'}
              helperText={
                authType === 'password' ? fieldErrors?.password : fieldErrors?.api_token
              }
              color={
                fieldErrors?.password || fieldErrors?.api_token ? 'error' : 'default'
              }
            />
            <TextInputType
              name="email"
              label="Email"
              helperText={fieldErrors?.username}
              color={fieldErrors?.username ? 'error' : 'default'}
            />
            <TextInputType
              name="accessKey"
              label="Project Key"
              helperText={fieldErrors?.jira_project_key}
              color={fieldErrors?.jira_project_key ? 'error' : 'default'}
            />
            <TextInputType
              name="task"
              label="Task Name"
              helperText={fieldErrors?.issue_type}
              color={fieldErrors?.issue_type ? 'error' : 'default'}
            />
            <TextInputType
              name="assigne"
              label="Assigne"
              helperText={fieldErrors?.jira_assignee}
              color={fieldErrors?.jira_assignee ? 'error' : 'default'}
            />
          </>
        )}

        {integrationType === IntegrationType.s3 && (
          <>
            <TextInputType
              name="name"
              label="Bucket Name"
              helperText={fieldErrors?.s3_bucket_name}
              color={fieldErrors?.s3_bucket_name ? 'error' : 'default'}
            />
            <TextInputType
              name="folder"
              label={'Folder'}
              helperText={fieldErrors?.aws_access_key}
              color={fieldErrors?.s3_folaws_access_keyder_name ? 'error' : 'default'}
            />
            <TextInputType
              name="accessKey"
              label="Access Key"
              helperText={fieldErrors?.jira_assignee}
              color={fieldErrors?.jira_assignee ? 'error' : 'default'}
            />
            <TextInputType
              name="secretKey"
              label="Secret Key"
              helperText={fieldErrors?.aws_secret_key}
              color={fieldErrors?.aws_secret_key ? 'error' : 'default'}
            />
            <TextInputType
              name="region"
              label="Region"
              helperText={fieldErrors?.aws_region}
              color={fieldErrors?.aws_region ? 'error' : 'default'}
            />
          </>
        )}

        <NotificationType />

        <input
          type="text"
          name="_actionType"
          readOnly
          hidden
          value={ActionEnumType.ADD}
        />
        {data?.message && <p className="text-red-500 text-sm">{data.message}</p>}
      </div>
      <div className="mt-14 flex gap-x-2">
        <Button size="md" color="default" type="submit">
          Add
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
  );
};
