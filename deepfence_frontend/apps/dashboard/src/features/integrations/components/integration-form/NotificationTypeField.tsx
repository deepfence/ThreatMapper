import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Listbox, ListboxOption } from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';
import { ScanTypeEnum } from '@/types/common';

import { AdvancedFilters } from './AdvancedFilter';
import { FieldSelection } from './FieldSelection';
import { TextInputType } from './TextInputType';
import {
  getDisplayNotification,
  IntegrationType,
  isCloudComplianceNotification,
  isCloudTrailNotification,
  isJiraIntegration,
  isUserActivityNotification,
  isVulnerabilityNotification,
} from './utils';

export const NotificationTypeField = ({
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
