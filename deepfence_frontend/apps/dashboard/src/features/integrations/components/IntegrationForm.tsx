import { useState } from 'react';
import { HiChevronDown } from 'react-icons/hi';
import { Form } from 'react-router-dom';
import { Button, Card, Dropdown, DropdownItem, TextInput } from 'ui-components';

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
      className="w-3/4 min-[200px] max-w-xs"
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
      className="w-3/4 min-[200px] max-w-xs"
      label="Channel Name"
      type={'text'}
      sizing="sm"
      name="channelName"
      placeholder="Channel Name"
    />
  );
};

const NotificationType = () => {
  const [notificationType, setNotificationType] = useState('');

  const onNotificationTypeSelection = (notificationType: string) => {
    setNotificationType(notificationType);
  };

  return (
    <div className="w-3/4 min-[200px] max-w-xs">
      <input
        type="text"
        name="_notificationType"
        readOnly
        hidden
        value={notificationType}
      />
      <Dropdown
        triggerAsChild
        align="start"
        content={
          <>
            <DropdownItem
              onClick={() => {
                onNotificationTypeSelection('vulnerability');
              }}
            >
              <span className="text-gray-700 dark:text-gray-400">Vulnerability</span>
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                onNotificationTypeSelection('malware');
              }}
            >
              <span className="text-gray-700 dark:text-gray-400">Malware</span>
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                onNotificationTypeSelection('secret');
              }}
            >
              <span className="text-gray-700 dark:text-gray-400">Secret</span>
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                onNotificationTypeSelection('compliance');
              }}
            >
              <span className="text-gray-700 dark:text-gray-400">Compliance</span>
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                onNotificationTypeSelection('cloudtrail_alert');
              }}
            >
              <span className="text-gray-700 dark:text-gray-400">CloudTrail Alert</span>
            </DropdownItem>
          </>
        }
      >
        <TextInput
          label="Notification Type"
          endIcon={<HiChevronDown />}
          sizing="sm"
          type="button"
          value={'Select Notification Type'}
        />
      </Dropdown>
    </div>
  );
};

export const IntegrationForm = ({ integrationType }: IntegrationTypeProps) => {
  return (
    <Form method="post">
      {integrationType === IntegrationType.slack && (
        <Card className="w-full relative p-5 mt-2 flex flex-col gap-y-4">
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
          <div className="flex mt-2 w-3/4 min-[200px] max-w-xs">
            <Button color="primary" className="w-full" size="xs" type="submit">
              Subscribe
            </Button>
          </div>
        </Card>
      )}
    </Form>
  );
};
