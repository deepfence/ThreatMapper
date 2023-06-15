import cx from 'classnames';
import { HiViewGridAdd } from 'react-icons/hi';
import { Card, Step, Stepper, Typography } from 'ui-components';

import { CopyToClipboard } from '@/components/CopyToClipboard';
import { useGetApiToken } from '@/features/common/data-component/getApiTokenApiLoader';

export const LinuxConnectorForm = () => {
  const { status, data } = useGetApiToken();
  const dfApiKey =
    status !== 'idle'
      ? '---DEEPFENCE-API-KEY---'
      : data?.api_token === undefined
      ? '---DEEPFENCE-API-KEY---'
      : data?.api_token;

  const code = `
docker run -dit \\
--cpus=".2" \\
--name=deepfence-agent \\
--restart on-failure \\
--pid=host \\
--net=host \\
--privileged=true \\
-v /sys/kernel/debug:/sys/kernel/debug:rw \\
-v /var/log/fenced \\
-v /var/run/docker.sock:/var/run/docker.sock \\
-v /:/fenced/mnt/host/:ro \\
-e USER_DEFINED_TAGS="" \\
-e MGMT_CONSOLE_URL="${window.location.host ?? '---CONSOLE-IP---'}" \\
-e MGMT_CONSOLE_PORT="443" \\
-e DEEPFENCE_KEY="${dfApiKey}" \\
deepfenceio/deepfence_agent_ce:2.0.0`;

  return (
    <Stepper>
      <Step indicator={<HiViewGridAdd />} title="Connect Linux VM">
        <div className={`${Typography.size.sm} dark:text-gray-200`}>
          Connect to Linux VM. Find out more information by{' '}
          <a
            href={`https://community.deepfence.io/threatmapper/docs/v2.0/sensors/docker`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-500 mt-2"
          >
            reading our documentation
          </a>
          .
        </div>
      </Step>
      <Step indicator="1" title="Deploy">
        <div className={`${Typography.size.sm} dark:text-gray-400`}>
          <p className="mb-2.5">
            Copy the following commands and paste them into your shell.
          </p>
          <Card className="w-full relative ">
            <pre
              className={cx(
                'pl-4 pt-4',
                'h-fit',
                `${Typography.weight.normal} ${Typography.size.xs} `,
              )}
            >
              {code}
            </pre>
            <CopyToClipboard data={code} asIcon />
          </Card>
        </div>
      </Step>
    </Stepper>
  );
};
