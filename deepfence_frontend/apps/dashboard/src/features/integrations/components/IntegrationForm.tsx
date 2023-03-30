import { HiChevronDown } from 'react-icons/hi';
import { useFetcher } from 'react-router-dom';
import { Button, Card, Dropdown, DropdownItem, TextInput } from 'ui-components';

type IntegrationTypeProps = {
  integrationType: string;
};

export const IntegrationType = {
  slack: 'slack',
} as const;

type ActionReturnType = {
  message?: string;
  success: boolean;
};

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

export const IntegrationForm = ({ integrationType }: IntegrationTypeProps) => {
  const fetcher = useFetcher<ActionReturnType>();

  const onSubscribe = (notificationType: string) => {};

  return (
    <fetcher.Form method="post">
      {integrationType === IntegrationType.slack && (
        <Card className="w-full relative p-5 mt-2 flex flex-col gap-y-4">
          <TextInputUrl />
          <TextInputChannel />
          <div className="w-3/4 min-[200px] max-w-xs">
            <Dropdown
              triggerAsChild
              align="start"
              content={
                <>
                  <DropdownItem
                    onClick={() => {
                      onSubscribe('vulnerability');
                    }}
                  >
                    <span className="text-gray-700 dark:text-gray-400">
                      Vulnerability
                    </span>
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      onSubscribe('malware');
                    }}
                  >
                    <span className="text-gray-700 dark:text-gray-400">Malware</span>
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      onSubscribe('secret');
                    }}
                  >
                    <span className="text-gray-700 dark:text-gray-400">Secret</span>
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      onSubscribe('compliance');
                    }}
                  >
                    <span className="text-gray-700 dark:text-gray-400">Compliance</span>
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      onSubscribe('cloudtrail_alert');
                    }}
                  >
                    <span className="text-gray-700 dark:text-gray-400">
                      CloudTrail Alert
                    </span>
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
          <div className="flex mt-2 w-3/4 min-[200px] max-w-xs">
            <Button color="primary" className="w-full" size="xs" type="submit">
              Subscribe
            </Button>
          </div>
        </Card>
      )}
    </fetcher.Form>
  );
};
