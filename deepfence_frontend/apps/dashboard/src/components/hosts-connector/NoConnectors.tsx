import { IconContext } from 'react-icons';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import { Typography } from 'ui-components';

import { DFLink } from '@/components/DFLink';

export const ACCOUNT_CONNECTOR = {
  DOCKER: 'docker',
  AWS: 'aws',
  AWS_ORG: 'aws_org',
  GCP: 'gcp',
  GCP_ORG: 'gcp_org',
  AZURE: 'azure',
  LINUX: 'linux',
  HOST: 'host',
  KUBERNETES: 'kubernetes',
  CLUSTER: 'cluster',
} as const;

export const NoConnectors = () => {
  return (
    <div className="flex flex-col items-center h-full w-full justify-center">
      <IconContext.Provider
        value={{
          className: 'mt-8 dark:text-blue-600 text-blue-400 w-[70px] h-[70px]',
        }}
      >
        <HiOutlineExclamationCircle />
      </IconContext.Provider>
      <p
        className={`mt-2 text-gray-900 dark:text-gray-400 ${Typography.size.base} ${Typography.weight.normal}`}
      >
        No Connectors are currently configured. Please{' '}
        <DFLink to="/onboard/connectors/add-connectors">click here</DFLink> to add a new
        Connectors.
      </p>
      <p
        className={`text-gray-900 dark:text-gray-400 ${Typography.size.base} ${Typography.weight.normal}`}
      >
        If you just added a Connectors, please wait for it to be fully configured.
      </p>
    </div>
  );
};
