import { upperCase } from 'lodash-es';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Checkbox, Listbox, ListboxOption, Tooltip } from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';
import { InfoStandardIcon } from '@/components/icons/common/InfoStandard';
import { ScanTypeEnum } from '@/types/common';

import { AdvancedFilters } from './AdvancedFilter';
import { FieldSelection } from './FieldSelection';
import { TextInputType } from './TextInputType';
import {
  canSendScanSummary,
  getNotificationPrettyName,
  IntegrationType,
  isCloudComplianceNotification,
  isCloudTrailNotification,
  isJiraIntegration,
  isUserActivityNotification,
  isVulnerabilityNotification,
} from './utils';

const SendScanSummaryCheckbox = ({ sendSummaryOnly }: { sendSummaryOnly: boolean }) => {
  const [checked, setChecked] = useState(sendSummaryOnly);
  return (
    <div className="flex gap-x-1.5 items-center col-span-2">
      <Checkbox
        name="sendSummary"
        label="Send scan summary only?"
        checked={checked}
        onCheckedChange={(check: boolean) => setChecked(check)}
      />
      <Tooltip content="By default complete scan results are sent. If you wish to send only scan summary, check this checkbox.">
        <div className="w-4 h-4">
          <InfoStandardIcon />
        </div>
      </Tooltip>
    </div>
  );
};
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
  const [cloud, setCloud] = useState<string>(data?.filters?.cloud_provider ?? 'aws');

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
          return getNotificationPrettyName(notificationType);
        }}
        required
      >
        {['Vulnerability', 'Secret', 'Malware', 'Compliance', 'CloudCompliance'].map(
          (notification) => {
            return (
              <ListboxOption key={notification} value={notification}>
                {getNotificationPrettyName(notification)}
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

      {canSendScanSummary(notificationType, integrationType) ? (
        <SendScanSummaryCheckbox sendSummaryOnly={data?.config?.send_summary ?? false} />
      ) : null}

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
              return upperCase(cloud);
            }}
          >
            {['aws', 'gcp', 'azure'].map((cloud) => {
              return (
                <ListboxOption value={cloud} key={cloud}>
                  {upperCase(cloud)}
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
