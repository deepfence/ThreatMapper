import cx from 'classnames';
import { startCase } from 'lodash-es';
import { HiOutlineArrowCircleRight, HiOutlineArrowLeft } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { generatePath, useParams } from 'react-router-dom';
import { Card } from 'ui-components';

import LogoAws from '@/assets/logo-aws.svg';
import LogoAwsWhite from '@/assets/logo-aws-white.svg';
import LogoAzure from '@/assets/logo-azure.svg';
import LogoCloudConnector from '@/assets/logo-cloud-connector.svg';
import LogoDocker from '@/assets/logo-docker.svg';
import LogoGoogle from '@/assets/logo-google.svg';
import LogoHostConnector from '@/assets/logo-host-connector.svg';
import LogoK8 from '@/assets/logo-k8.svg';
import LogoLinux from '@/assets/logo-linux.svg';
import { AWSCloudFormation } from '@/components/clouds-connector/AWSCloudFormation';
import { AWSTerraform } from '@/components/clouds-connector/AWSTerraform';
import { AzureConnectorForm } from '@/components/clouds-connector/AzureConnectorForm';
import { GCPConnectorForm } from '@/components/clouds-connector/GCPConnectorForm';
import { DFLink } from '@/components/DFLink';
import { DockerConnectorForm } from '@/components/hosts-connector/DockerConnectorForm';
import { K8ConnectorForm } from '@/components/hosts-connector/K8ConnectorForm';
import { LinuxConnectorForm } from '@/components/hosts-connector/LinuxConnectorForm';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { useTheme } from '@/theme/ThemeContext';
import { usePageNavigation } from '@/utils/usePageNavigation';

interface CardConnectProps {
  path: string;
  label: string;
  icon: string;
}

const ACCOUNT_CONNECTOR = {
  DOCKER: 'docker container',
  AWS: 'amazon web services',
  GCP: 'google cloud platform',
  AZURE: 'microsoft azure',
  LINUX: 'linux bare-metal vm',
  HOST: 'host',
  KUBERNETES: 'kubernetes cluster',
  CLUSTER: 'cluster',
} as const;

const CardConnect = ({ label, path, icon }: CardConnectProps) => {
  const { navigate } = usePageNavigation();
  const handleSelection = () => {
    navigate(
      generatePath(`../../settings/connector-instructions/:connectorType`, {
        connectorType: path,
      }),
    );
  };

  return (
    <div className="px-6">
      <button
        className={cx(
          'text-sm text-left flex items-center w-full gap-5',
          'border-b dark:border-gray-700 border-gray-200 h-[72px] dark:text-gray-300 dark:bg-transparent',
        )}
        onClick={handleSelection}
      >
        <div className="w-10">
          <img src={icon} alt="Cloud Connector" />
        </div>
        <div className="whitespace-nowrap overflow-hidden text-ellipsis">{label}</div>
        <IconContext.Provider
          value={{
            className: 'ml-auto text-blue-700 dark:text-blue-500',
            size: '18px',
          }}
        >
          <HiOutlineArrowCircleRight />
        </IconContext.Provider>
      </button>
    </div>
  );
};

const Cloud = () => {
  const { mode } = useTheme();
  const connectors = [
    {
      icon: mode === 'dark' ? LogoAwsWhite : LogoAws,
      label: 'Amazon Web Services (AWS)',
      path: ACCOUNT_CONNECTOR.AWS,
    },
    {
      icon: LogoGoogle,
      label: 'Google Cloud Platform',
      path: ACCOUNT_CONNECTOR.GCP,
    },
    {
      icon: LogoAzure,
      label: 'Microsoft Azure',
      path: ACCOUNT_CONNECTOR.AZURE,
    },
  ];
  return (
    <>
      <div className="py-4 items-center flex px-6">
        <img
          src={LogoCloudConnector}
          alt="Cloud Connector"
          width="28"
          height="28"
          className="pr-2"
        />
        <span className={`text-2xl font-medium leading-[29px] dark:text-gray-50`}>
          Cloud
        </span>
      </div>
      <div className="mb-4">
        <p
          className={`px-6 text-sm font-normal leading-6 text-gray-700 dark:text-gray-400 min-h-[110px]`}
        >
          Connect an AWS, GCP, or Azure cloud account to check for compliance
          misconfigurations.
        </p>
        <div className="flex flex-col">
          {connectors.map((connector) => {
            return (
              <div
                key={connector.label}
                className={cx(
                  'hover:bg-[linear-gradient(270deg,_#EBF5FF_-0.07%,_#FFFFFF_100%)]',
                  'dark:hover:bg-[linear-gradient(270deg,_#1c2431_-0.07%,_#1f2937_100%)]',
                )}
              >
                <CardConnect {...connector} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
const Host = () => {
  const connectors = [
    {
      icon: LogoK8,
      label: 'Kubernetes Clusters',
      path: ACCOUNT_CONNECTOR.KUBERNETES,
    },
    {
      icon: LogoDocker,
      label: 'Docker Container',
      path: ACCOUNT_CONNECTOR.DOCKER,
    },
    {
      icon: LogoLinux,
      label: 'Linux Bare-Metal/VM',
      path: ACCOUNT_CONNECTOR.LINUX,
    },
  ];

  return (
    <>
      <div className="py-4 items-center flex px-6">
        <img
          src={LogoHostConnector}
          alt="Cloud Connector"
          width="28"
          height="28"
          className="pr-2"
        />
        <span className={`text-2xl font-medium leading-[29px] dark:text-gray-50`}>
          Host
        </span>
      </div>
      <div className="mb-4">
        <p
          className={`px-6 text-sm font-normal leading-6 text-gray-700 dark:text-gray-400 min-h-[110px]`}
        >
          Connect a K8s cluster, Docker container, or Linux host to check for
          vulnerabilities, secrets, malware, and compliance misconfigurations.
        </p>
        <div className="flex flex-col">
          {connectors.map((connector) => {
            return (
              <div
                key={connector.label}
                className={cx(
                  'hover:bg-[linear-gradient(270deg,_#EBF5FF_-0.07%,_#FFFFFF_100%)]',
                  'dark:hover:bg-[linear-gradient(270deg,_#1c2431_-0.07%,_#1f2937_100%)]',
                )}
              >
                <CardConnect {...connector} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
const Instructions = ({ connectorType }: { connectorType: string }) => {
  return (
    <>
      <div className="p-2 flex gap-x-2 items-center">
        <DFLink to={'../connection-instructions'}>
          <IconContext.Provider
            value={{
              className: 'h-5 w-5',
            }}
          >
            <HiOutlineArrowLeft />
          </IconContext.Provider>
        </DFLink>
        <h3 className="font-medium text-gray-900 dark:text-white text-base">
          {startCase(connectorType)}
        </h3>
      </div>
      <div className="pt-2">
        {ACCOUNT_CONNECTOR.DOCKER === connectorType && <DockerConnectorForm />}
        {ACCOUNT_CONNECTOR.KUBERNETES === connectorType && <K8ConnectorForm />}
        {ACCOUNT_CONNECTOR.LINUX === connectorType && <LinuxConnectorForm />}
        {ACCOUNT_CONNECTOR.AWS === connectorType && (
          <div className="flex gap-x-2 flex-col sm:flex-row flex-1">
            <AWSCloudFormation />
            <AWSTerraform />
          </div>
        )}
        {ACCOUNT_CONNECTOR.AZURE === connectorType && <AzureConnectorForm />}
        {ACCOUNT_CONNECTOR.GCP === connectorType && <GCPConnectorForm />}
      </div>
    </>
  );
};
const Connectors = () => {
  return (
    <div className="max-w-[900px]">
      <div className="mt-2">
        <h3 className="font-medium text-gray-900 dark:text-white text-base">
          Connection instructions
        </h3>
      </div>
      <div className="h-full dark:text-white mt-4">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 sm:grid-cols-2">
          <Card className="dark:border-0">
            <Cloud />
          </Card>
          <Card className="dark:border-0">
            <Host />
          </Card>
        </div>
      </div>
    </div>
  );
};
const ConnectorInstructions = () => {
  const { connectorType } = useParams() as {
    connectorType: string;
  };

  if (connectorType) {
    return <Instructions connectorType={connectorType} />;
  }
  return <Connectors />;
};

export const module = {
  element: <ConnectorInstructions />,
};
