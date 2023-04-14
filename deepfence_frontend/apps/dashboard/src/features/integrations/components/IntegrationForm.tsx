import { useState } from 'react';
import { Form, useActionData, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  CircleSpinner,
  Radio,
  Select,
  SelectItem,
  TextInput,
} from 'ui-components';

import { useGetClustersList } from '@/features/common/data-component/searchClustersApiLoader';
import { useGetContainerImagesList } from '@/features/common/data-component/searchContainerImagesApiLoader';
import { useGetHostsList } from '@/features/common/data-component/searchHostsApiLoader';
import { ScanTypeEnum } from '@/types/common';

import {
  ActionEnumType,
  CLOUD_TRAIL_ALERT,
  USER_ACTIVITIES,
} from '../pages/IntegrationAdd';

type IntegrationTypeProps = {
  integrationType: string;
};

export const IntegrationType = {
  slack: 'slack',
  pagerDuty: 'pager-duty',
  email: 'email',
  httpEndpoint: 'http-endpoint',
  microsoftTeams: 'microsoft-teams',
  splunk: 'splunk',
  sumoLogic: 'sumo-logic',
  elasticsearch: 'elasticsearch',
  googleChronicle: 'google-chronicle',
  awsSecurityHub: 'aws-security-hub',
  jira: 'jira',
  s3: 's3',
} as const;

const UserActivityIntegration: string[] = [
  IntegrationType.splunk,
  IntegrationType.sumoLogic,
  IntegrationType.elasticsearch,
  IntegrationType.googleChronicle,
  IntegrationType.awsSecurityHub,
  IntegrationType.jira,
  IntegrationType.s3,
];

const CloudTrailIntegration: string[] = [
  IntegrationType.slack,
  IntegrationType.pagerDuty,
  IntegrationType.email,
  IntegrationType.httpEndpoint,
  IntegrationType.microsoftTeams,
  IntegrationType.splunk,
  IntegrationType.sumoLogic,
  IntegrationType.elasticsearch,
  IntegrationType.googleChronicle,
  IntegrationType.awsSecurityHub,
];

const TextInputType = ({ label, name }: { label: string; name: string }) => {
  return (
    <TextInput
      className="w-full"
      label={label}
      type={'text'}
      sizing="sm"
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
  // host
  const { hosts, status: listHostStatus } = useGetHostsList({
    scanType: API_SCAN_TYPE_MAP[notificationType],
  });
  const [selectedHosts, setSelectedHosts] = useState([]);

  // images
  const { containerImages, status: listImagesStatus } = useGetContainerImagesList({
    scanType: API_SCAN_TYPE_MAP[notificationType],
  });
  const [selectedImages, setSelectedImages] = useState([]);

  // kubernetes
  const { clusters, status: listClusterStatus } = useGetClustersList();
  const [selectedCluster, setSelectedClusters] = useState([]);

  // severity
  const [selectedSeverity, setSelectedSeverity] = useState('');

  // status
  const [selectedStatus, setSelectedStatus] = useState('');

  return (
    <div className="flex flex-col">
      <fieldset className="mt-4 mb-1">
        <legend className="text-sm font-medium text-gray-900 dark:text-white">
          Filters
        </legend>
      </fieldset>
      {listHostStatus !== 'idle' ? (
        <CircleSpinner size="xs" />
      ) : (
        <>
          <Select
            value={selectedHosts}
            name="hostFilter"
            onChange={(value) => {
              setSelectedHosts(value);
            }}
            placeholder="Select host"
            sizing="xs"
          >
            {hosts.map((host) => {
              return (
                <SelectItem value={host.hostName} key={host.nodeId}>
                  {host.hostName}
                </SelectItem>
              );
            })}
          </Select>
        </>
      )}

      {listImagesStatus !== 'idle' ? (
        <CircleSpinner size="xs" />
      ) : (
        <>
          <Select
            value={selectedImages}
            name="imageFilter"
            onChange={(value) => {
              setSelectedImages(value);
            }}
            placeholder="Select image"
            sizing="xs"
          >
            {containerImages.map((image) => {
              return (
                <SelectItem value={image.nodeId} key={image.nodeId}>
                  {image.containerImage}
                </SelectItem>
              );
            })}
          </Select>
        </>
      )}

      {listClusterStatus !== 'idle' ? (
        <CircleSpinner size="xs" />
      ) : (
        <>
          <Select
            value={selectedCluster}
            name="clusterFilter"
            onChange={(value) => {
              setSelectedClusters(value);
            }}
            placeholder="Select cluster"
            sizing="xs"
          >
            {clusters.map((cluster) => {
              return (
                <SelectItem value={cluster.clusterId} key={cluster.clusterId}>
                  {cluster.clusterName}
                </SelectItem>
              );
            })}
          </Select>
        </>
      )}

      {notificationType === ScanTypeEnum.ComplianceScan ? (
        <Select
          value={selectedStatus}
          name="statusFilter"
          onChange={(value) => {
            setSelectedStatus(value);
          }}
          placeholder="Select status"
          sizing="xs"
        >
          <SelectItem value={'Alarm'}>Alarm</SelectItem>
          <SelectItem value={'Info'}>Info</SelectItem>
          <SelectItem value={'Ok'}>Ok</SelectItem>
          <SelectItem value={'Skip'}>Skip</SelectItem>
        </Select>
      ) : null}

      {Object.values(ScanTypeEnum)
        .filter((val) => val !== ScanTypeEnum.ComplianceScan)
        .includes(notificationType as ScanTypeEnum) ? (
        <Select
          value={selectedSeverity}
          name="severityFilter"
          onChange={(value) => {
            setSelectedSeverity(value);
          }}
          placeholder="Select severity"
          sizing="xs"
        >
          <SelectItem value={'Critical'}>Critical</SelectItem>
          <SelectItem value={'High'}>High</SelectItem>
          <SelectItem value={'Medium'}>Medium</SelectItem>
          <SelectItem value={'Low'}>Low</SelectItem>
        </Select>
      ) : null}
    </div>
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
      <Select
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
        sizing="xs"
      >
        <SelectItem value={'Vulnerability'}>Vulnerability</SelectItem>
        <SelectItem value={'Secret'}>Secret</SelectItem>
        <SelectItem value={'Malware'}>Malware</SelectItem>
        <SelectItem value={'Compliance'}>Compliance</SelectItem>

        {CloudTrailIntegration.includes(integrationType) && (
          <SelectItem value={CLOUD_TRAIL_ALERT}>CloudTrail Alert</SelectItem>
        )}

        {UserActivityIntegration.includes(integrationType) ? (
          <SelectItem value={USER_ACTIVITIES}>User Activities</SelectItem>
        ) : null}
      </Select>

      {notificationType &&
      !isCloudTrailNotification(notificationType) &&
      !isUserActivityNotification(notificationType) &&
      !isTicketingIntegration(integrationType) &&
      !isArchivalIntegration(integrationType) ? (
        <AdvancedFilters notificationType={notificationType} />
      ) : null}

      {isCloudTrailNotification(notificationType) && <>Add Cloud trails here</>}

      {isUserActivityNotification(notificationType) && (
        <div className="mt-3">
          <TextInputType name="interval" label="Enter interval" />
        </div>
      )}
    </div>
  );
};

export const IntegrationForm = ({ integrationType }: IntegrationTypeProps) => {
  const actionData = useActionData() as {
    message: string;
  };

  // for jira
  const [authType, setAuthType] = useState('apiToken');

  return (
    <Form method="post">
      <Card className="w-full relative p-5 flex flex-col gap-y-4">
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
              name="authType"
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
        {actionData?.message && (
          <p className="text-red-500 text-sm">{actionData.message}</p>
        )}

        <div className="flex mt-2 w-full">
          <Button color="primary" className="w-full" size="xs" type="submit">
            Subscribe
          </Button>
        </div>
      </Card>
    </Form>
  );
};
