import { useState } from 'react';
import { useFetcher, useParams } from 'react-router-dom';
import { Button, Listbox, ListboxOption, Radio, TextInput } from 'ui-components';

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

const TextInputType = ({ label, name }: { label: string; name: string }) => {
  return (
    <TextInput
      className="w-full"
      label={label}
      type={'text'}
      name={name}
      placeholder={label}
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
    <>
      <div className="mt-10 flex gap-x-1 items-center dark:text-text-input-value ">
        <span className="w-3 h-3">
          <CaretDown />
        </span>
        <div className="text-h5">Advanced Filter (Optional)</div>
      </div>
      <div className="grid grid-cols-2 gap-y-8 gap-x-8 pt-4">
        <SearchableHostList scanType={API_SCAN_TYPE_MAP[notificationType]} />

        <SearchableContainerList scanType={API_SCAN_TYPE_MAP[notificationType]} />
        <SearchableImageList scanType={API_SCAN_TYPE_MAP[notificationType]} />

        <SearchableClusterList />

        {notificationType === 'Compliance' || notificationType === 'CloudCompliance' ? (
          <Listbox
            variant="outline"
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
            variant="outline"
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
    </>
  );
};

const NotificationType = () => {
  const [notificationType, setNotificationType] = useState<ScanTypeEnum | string>('');

  const { integrationType } = useParams() as {
    integrationType: string;
  };

  if (!integrationType) {
    console.warn('Notification Type is required to get scan resource type');
    return null;
  }

  return (
    <div className="w-full">
      <Listbox
        variant="outline"
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
          <TextInputType name="interval" label="Enter interval" />
        </div>
      )}

      {notificationType &&
      !isCloudTrailNotification(notificationType) &&
      !isUserActivityNotification(notificationType) &&
      !isTicketingIntegration(integrationType) &&
      !isArchivalIntegration(integrationType) ? (
        <AdvancedFilters notificationType={notificationType} />
      ) : (
        <div className="mt-10 flex gap-x-1 items-center dark:text-text-input-value ">
          <span className="w-3 h-3 -rotate-90">
            <CaretDown />
          </span>
          <div className="text-h5">Advanced Filter (Optional)</div>
        </div>
      )}
    </div>
  );
};

export const IntegrationForm = ({
  integrationType,
  setOpenModal,
}: IntegrationTypeProps) => {
  const fetcher = useFetcher<{
    message: string;
  }>();
  const { state, data } = fetcher;

  // for jira
  const [authType, setAuthType] = useState('apiToken');

  return (
    <fetcher.Form method="post" className="m-4">
      <div className="grid grid-cols-2 relative gap-y-8 gap-x-8">
        {integrationType === IntegrationType.slack && (
          <>
            <TextInputType name="url" label="Webhook Url" />
            <TextInputType name="channelName" label="Channel Name" />
          </>
        )}
        {integrationType === IntegrationType.pagerDuty && (
          <>
            <TextInputType name="integrationKey" label="Integration key" />
            <TextInputType name="apiKey" label="Api key" />
          </>
        )}
        {integrationType === IntegrationType.email && (
          <>
            <TextInputType name="email" label="Email id" />
          </>
        )}
        {integrationType === IntegrationType.httpEndpoint && (
          <>
            <TextInputType name="apiUrl" label="API url" />
            <TextInputType name="authorizationKey" label="Authorization key" />
          </>
        )}
        {integrationType === IntegrationType.microsoftTeams && (
          <>
            <TextInputType name="url" label="Webhook Url" />
          </>
        )}

        {integrationType === IntegrationType.splunk && (
          <>
            <TextInputType name="url" label="Endpoint Url" />
            <TextInputType name="token" label="Receiver Token" />
          </>
        )}

        {integrationType === IntegrationType.sumoLogic && (
          <>
            <TextInputType name="url" label="Endpoint Url" />
          </>
        )}

        {integrationType === IntegrationType.elasticsearch && (
          <>
            <TextInputType name="url" label="Endpoint Url" />
            <TextInputType name="index" label="Index" />
            <TextInputType name="docType" label="Doc Type" />
            <TextInputType name="authKey" label="Auth Key" />
          </>
        )}

        {integrationType === IntegrationType.googleChronicle && (
          <>
            <TextInputType name="url" label="Api Url" />
            <TextInputType name="authKey" label="Auth Key" />
          </>
        )}

        {integrationType === IntegrationType.httpEndpoint && (
          <>
            <TextInputType name="accessKey" label="Access Key" />
            <TextInputType name="secretKey" label="Secret Key" />
            <TextInputType name="region" label="Region" />
          </>
        )}

        {integrationType === IntegrationType.awsSecurityHub && (
          <>
            <TextInputType name="accessKey" label="Access Key" />
            <TextInputType name="secretKey" label="Secret Key" />
            <TextInputType name="region" label="Region" />
          </>
        )}

        {integrationType === IntegrationType.jira && (
          <>
            <TextInputType name="url" label="Endpoint Url" />
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
            />
            <TextInputType name="email" label="Email" />
            <TextInputType name="accessKey" label="Project Key" />
            <TextInputType name="task" label="Task Name" />
            <TextInputType name="assigne" label="Assigne" />
          </>
        )}

        {integrationType === IntegrationType.s3 && (
          <>
            <TextInputType name="name" label="Bucket Name" />
            <TextInputType name="folder" label={'Folder'} />
            <TextInputType name="accessKey" label="Access Key" />
            <TextInputType name="secretKey" label="Secret Key" />
            <TextInputType name="region" label="Region" />
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
