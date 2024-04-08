import { DFLink } from '@/components/DFLink';
import { ErrorStandardSolidIcon } from '@/components/icons/common/ErrorStandardSolid';

export const ACCOUNT_CONNECTOR = {
  DOCKER: 'docker',
  AWS: 'aws',
  GCP: 'gcp',
  AZURE: 'azure',
  LINUX: 'linux',
  HOST: 'host',
  KUBERNETES: 'kubernetes',
  CLUSTER: 'cluster',
  AWS_ECS: 'aws_ecs',
} as const;

export const NoConnectors = () => {
  return (
    <div className="flex flex-col items-center h-full w-full justify-center">
      <div className="w-6 h-6 text-status-error rounded-full">
        <ErrorStandardSolidIcon />
      </div>
      <p className={`mt-2 text-gray-900 dark:text-gray-400 text-p2`}>
        No Connectors are currently configured. Please{' '}
        <DFLink to="/onboard/connectors/add-connectors">click here</DFLink> to add a new
        Connectors.
      </p>
      <p className={`text-gray-900 dark:text-gray-400 text-p2`}>
        If you just added a Connectors, please wait for it to be fully configured.
      </p>
    </div>
  );
};
