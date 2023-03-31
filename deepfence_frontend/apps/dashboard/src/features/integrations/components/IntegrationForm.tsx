import { useState } from 'react';
import { Form, useActionData } from 'react-router-dom';
import {
  Button,
  Card,
  CircleSpinner,
  Select,
  SelectItem,
  TextInput,
} from 'ui-components';

import { useGetClustersList } from '@/features/common/data-component/searchClustersApiLoader';
import { useGetContainerImagesList } from '@/features/common/data-component/searchContainerImagesApiLoader';
import { useGetHostsList } from '@/features/common/data-component/searchHostsApiLoader';
import { ScanTypeEnum } from '@/types/common';

import { ActionEnumType } from '../pages/IntegrationAdd';

type IntegrationTypeProps = {
  integrationType: string;
};

export const IntegrationType = {
  slack: 'slack',
} as const;

const TextInputUrl = () => {
  return (
    <TextInput
      className="w-full"
      label="Webhook Url"
      type={'text'}
      sizing="sm"
      name="url"
      placeholder="Webhook Url"
    />
  );
};

const TextInputChannel = () => {
  return (
    <TextInput
      className="w-full"
      label="Channel Name"
      type={'text'}
      sizing="sm"
      name="channelName"
      placeholder="Channel Name"
    />
  );
};
const Filters = ({ notificationType }: { notificationType: ScanTypeEnum }) => {
  // host
  const { hosts, status: listHostStatus } = useGetHostsList({
    scanType: notificationType,
  });
  const [selectedHosts, setSelectedHosts] = useState([]);

  // images
  const { containerImages, status: listImagesStatus } = useGetContainerImagesList({
    scanType: notificationType,
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
        <SelectItem value={ScanTypeEnum.VulnerabilityScan}>Vulnerability</SelectItem>
        <SelectItem value={ScanTypeEnum.SecretScan}>Secret</SelectItem>
        <SelectItem value={ScanTypeEnum.MalwareScan}>Malware</SelectItem>
        <SelectItem value={ScanTypeEnum.ComplianceScan}>Compliance</SelectItem>
        <SelectItem value={'CloudTrail Alert'}>CloudTrail Alert</SelectItem>
      </Select>

      {notificationType && notificationType !== 'CloudTrail Alert' ? (
        <Filters notificationType={notificationType as ScanTypeEnum} />
      ) : null}

      {notificationType && notificationType === 'CloudTrail Alert' && (
        <>Add Cloud trails here</>
      )}
    </div>
  );
};

export const IntegrationForm = ({ integrationType }: IntegrationTypeProps) => {
  const actionData = useActionData() as {
    message: string;
  };

  return (
    <Form method="post">
      {integrationType === IntegrationType.slack && (
        <Card className="w-full relative p-5 flex flex-col gap-y-4">
          <TextInputUrl />
          <TextInputChannel />
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
      )}
    </Form>
  );
};
