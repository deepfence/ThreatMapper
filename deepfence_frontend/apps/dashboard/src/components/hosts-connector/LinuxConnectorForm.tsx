import { Card, IconButton, Step, Stepper } from 'ui-components';

import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { DFLink } from '@/components/DFLink';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { InfoIcon } from '@/components/icons/common/Info';
import { useGetApiToken } from '@/features/common/data-component/getApiTokenApiLoader';

export const LinuxConnectorForm = () => {
  const { status, data } = useGetApiToken();
  const { copy, isCopied } = useCopyToClipboardState();

  const dfApiKey =
    status !== 'idle'
      ? '---DEEPFENCE-API-KEY---'
      : data?.api_token === undefined
      ? '---DEEPFENCE-API-KEY---'
      : data?.api_token;

  const code = `docker run -dit \\
--cpus=".2" \\
--name=deepfence-agent \\
--restart on-failure \\
--pid=host --net=host \\
--privileged=true \\
-v /sys/kernel/debug:/sys/kernel/debug:rw \\
-v /var/log/fenced \\
-v /var/run/docker.sock:/var/run/docker.sock \\
-v /:/fenced/mnt/host/:ro \\
-e USER_DEFINED_TAGS="" \\
-e MGMT_CONSOLE_URL="${window.location.host ?? '---CONSOLE-IP---'}" \\
-e MGMT_CONSOLE_PORT="443" \\
-e DEEPFENCE_KEY="${dfApiKey}" \\
deepfenceio/deepfence_agent_ce:latest`;

  return (
    <Stepper>
      <Step
        indicator={
          <span className="w-4 h-4">
            <InfoIcon />
          </span>
        }
        title="Connect Linux VM"
      >
        <div className="text-p7 dark:text-text-text-and-icon">
          Connect to Linux VM. Find out more information by{' '}
          <DFLink
            href={`https://docs.deepfence.io/docs/threatmapper/sensors/linux-host/`}
            target="_blank"
            rel="noreferrer"
            className="mt-2"
          >
            reading our documentation
          </DFLink>
          .
        </div>
      </Step>
      <Step indicator="1" title="Deploy">
        <div className="text-p7 dark:text-text-text-and-icon">
          <p className="mb-2.5">
            Copy the following commands and paste them into your shell.
          </p>
          <Card className="w-full relative flex p-4">
            <pre className="h-fit text-p7 dark:text-text-text-and-icon">{code}</pre>
            <div className="flex items-center ml-auto self-start">
              {isCopied ? 'copied' : null}
              <IconButton
                className="dark:focus:outline-none"
                icon={<CopyLineIcon />}
                variant="flat"
                onClick={() => {
                  copy(code);
                }}
              />
            </div>
          </Card>
        </div>
      </Step>
    </Stepper>
  );
};
