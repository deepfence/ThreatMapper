import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useState } from 'react';
import { Card, IconButton, Step, StepIndicator, StepLine, Stepper } from 'ui-components';

import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { DFLink } from '@/components/DFLink';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { InfoIcon } from '@/components/icons/common/Info';
import { queries } from '@/queries';

const useGetApiToken = () => {
  return useSuspenseQuery({
    ...queries.auth.apiToken(),
  });
};
const useGetVersion = () => {
  return useSuspenseQuery({
    ...queries.setting.productVersion(),
  });
};
const PLACEHOLDER_API_KEY = '---DEEPFENCE-API-KEY--';

const SetConsoleURLCommand = ({ command }: { command: string }) => {
  const { copy, isCopied } = useCopyToClipboardState();
  const { status, data } = useGetApiToken();
  const apiToken = data?.apiToken?.api_token;
  const dfApiKey =
    status !== 'success'
      ? PLACEHOLDER_API_KEY
      : apiToken === undefined
      ? PLACEHOLDER_API_KEY
      : apiToken;
  const { data: dataVersion } = useGetVersion();
  return (
    <div className="relative flex items-center">
      <pre className="h-fit text-p7 dark:text-text-text-and-icon">
        {command.replace(PLACEHOLDER_API_KEY, dfApiKey)}
      </pre>
      <div className="flex items-center ml-auto self-start">
        {isCopied ? 'copied' : null}
        <IconButton
          className="dark:focus:outline-none"
          icon={<CopyLineIcon />}
          variant="flat"
          onClick={() => {
            copy(command.replace(PLACEHOLDER_API_KEY, dfApiKey));
          }}
        />
      </div>
    </div>
  );
};

const UninstallDeepfenceCommand = () => {
  const { copy, isCopied } = useCopyToClipboardState();
  return (
    <div className="relative flex items-center">
      <pre className="h-fit text-p7 dark:text-text-text-and-icon">
        sudo bash uninstall_deepfence.sh
      </pre>
      <div className="flex items-center ml-auto self-start">
        {isCopied ? 'copied' : null}
        <IconButton
          className="dark:focus:outline-none"
          icon={<CopyLineIcon />}
          variant="flat"
          onClick={() => {
            copy('sudo bash uninstall_deepfence.sh');
          }}
        />
      </div>
    </div>
  );
};

const Skeleton = () => {
  return (
    <>
      <div className="animate-pulse flex flex-col gap-y-2">
        <div className="h-2 w-[384px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[350px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[420px] bg-gray-200 dark:bg-gray-700 rounded"></div>

        <div className="h-2 w-[200px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[300px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[280px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[380px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[370px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[360px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[480px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[200px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[180px] bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </>
  );
};

export const LinuxConnectorForm = () => {
  const [instructionConsoleURL] = useState(`export MGMT_CONSOLE_URL="${
    window.location.host ?? '---CONSOLE-IP---'
  }"
export DEEPFENCE_KEY="${PLACEHOLDER_API_KEY}"`);
  const [instructionStart] = useState(`sudo bash install_deepfence_agent.sh`);

  return (
    <Stepper>
      <Step
        indicator={
          <StepIndicator className="rounded-full">
            <div className="w-6 h-6 flex items-center justify-center">
              <span className="w-4 h-4">
                <InfoIcon />
              </span>
            </div>
            <StepLine />
          </StepIndicator>
        }
        title="Connect Linux VM"
      >
        <div className="text-p7 dark:text-text-text-and-icon">
          Connect to Linux VM. Find out more information by{' '}
          <DFLink
            href={`https://community.deepfence.io/threatmapper/docs/v2.1/sensors/linux-host`}
            target="_blank"
            rel="noreferrer"
            className="mt-2"
          >
            reading our documentation
          </DFLink>
          .
        </div>
      </Step>
      <Step
        indicator={
          <StepIndicator className="rounded-full">
            <span className="w-6 h-6 flex items-center justify-center">1</span>
            <StepLine />
          </StepIndicator>
        }
        title="Copy the script"
      >
        <div>
          <p className="mb-2.5 text-p7 dark:text-text-text-and-icon">
            Copy the install script from{' '}
            <DFLink
              href={`https://community.deepfence.io/threatmapper/docs/v2.1/sensors/linux-host#threatmapper-sensor-agents`}
              target="_blank"
              rel="noreferrer"
              className="mt-2"
            >
              here
            </DFLink>{' '}
            and save it in your Continuous Deployment tool or the linux vm directly as{' '}
            <b>install_deepfence_agent.sh</b>
          </p>
        </div>
      </Step>
      <Step
        indicator={
          <StepIndicator className="rounded-full">
            <span className="w-6 h-6 flex items-center justify-center">2</span>
            <StepLine />
          </StepIndicator>
        }
        title="Set console URL and key"
      >
        <div>
          <p className="mb-2.5 text-p7 dark:text-text-text-and-icon">
            Set management console URL and Deepfence key in the script.
          </p>
          <Card className="w-full relative p-4">
            <Suspense fallback={<Skeleton />}>
              <SetConsoleURLCommand command={instructionConsoleURL} />
            </Suspense>
          </Card>
        </div>
      </Step>
      <Step
        indicator={
          <StepIndicator className="rounded-full">
            <span className="w-6 h-6 flex items-center justify-center">3</span>
          </StepIndicator>
        }
        title="Start Deepfence agent"
      >
        <div>
          <p className="mb-2.5 text-p7 dark:text-text-text-and-icon">
            Run the following command as a privileged user to start Deepfence agent
          </p>
          <Card className="w-full relative p-4">
            <Suspense fallback={<Skeleton />}>
              <SetConsoleURLCommand command={instructionStart} />
            </Suspense>
          </Card>
        </div>
        <div className="mt-4">
          <p className="mb-2.5 text-p7 dark:text-text-text-and-icon">
            This will also create a new file <b>uninstall_deepfence.sh</b>. You can run to
            to uninstall Deepfence agent.
          </p>
          <Card className="w-full relative p-4">
            <UninstallDeepfenceCommand />
          </Card>
        </div>
      </Step>
    </Stepper>
  );
};
