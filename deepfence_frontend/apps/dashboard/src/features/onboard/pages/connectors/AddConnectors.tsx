import cx from 'classnames';
import { useRef } from 'react';
import { IconContext } from 'react-icons';
import { HiOutlineArrowCircleRight } from 'react-icons/hi';
import { Card, Tabs, Typography } from 'ui-components';

import LogoAws from '@/assets/logo-aws.svg';
import LogoAwsWhite from '@/assets/logo-aws-white.svg';
import LogoAzure from '@/assets/logo-azure.svg';
import LogoAzureRegistry from '@/assets/logo-azure-registry.svg';
import LogoCloudConnector from '@/assets/logo-cloud-connector.svg';
import LogoDocker from '@/assets/logo-docker.svg';
import LogoGoogle from '@/assets/logo-google.svg';
import LogoHostConnector from '@/assets/logo-host-connector.svg';
import LogoK8 from '@/assets/logo-k8.svg';
import LogoLinux from '@/assets/logo-linux.svg';
import LogoRegistryConnector from '@/assets/logo-registry-connector.svg';
import { connectorLayoutTabs } from '@/features/onboard/layouts/ConnectorsLayout';
import { useTheme } from '@/theme/ThemeContext';
import { usePageNavigation } from '@/utils/usePageNavigation';

interface CardConnectProps {
  path: string;
  label: string;
  icon: string;
}

const CardConnect = ({ label, path, icon }: CardConnectProps) => {
  const { navigate } = usePageNavigation();
  const handleSelection = () => {
    navigate(`../../instructions/${path}`);
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
      path: 'cloud/aws',
    },
    {
      icon: LogoGoogle,
      label: 'Google Cloud Platform',
      path: 'cloud/gcp',
    },
    {
      icon: LogoAzure,
      label: 'Microsoft Azure',
      path: 'cloud/azure',
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
        <span
          className={`${Typography.size['2xl']} ${Typography.weight.medium} leading-[29px] dark:text-gray-50`}
        >
          Cloud
        </span>
      </div>
      <div className="mb-4">
        <p
          className={`px-6 ${Typography.size.sm} ${Typography.weight.normal} leading-6 text-gray-700 dark:text-gray-400 min-h-[110px]`}
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
      path: 'host/k8s',
    },
    {
      icon: LogoDocker,
      label: 'Docker Container',
      path: 'host/docker',
    },
    {
      icon: LogoLinux,
      label: 'Linux Bare-Metal/VM',
      path: 'host/linux',
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
        <span
          className={`${Typography.size['2xl']} ${Typography.weight.medium} leading-[29px] dark:text-gray-50`}
        >
          Host
        </span>
      </div>
      <div className="mb-4">
        <p
          className={`px-6 ${Typography.size.sm} ${Typography.weight.normal} leading-6 text-gray-700 dark:text-gray-400 min-h-[110px]`}
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

const Registries = () => {
  const { mode } = useTheme();
  const connectors = [
    {
      icon: mode === 'dark' ? LogoAwsWhite : LogoAws,
      label: 'Amazon Elastic Container Registry',
      path: 'registry/amazon-ecr',
    },
    {
      icon: LogoAzureRegistry,
      label: 'Azure Container Registry',
      path: 'registry-azure',
    },
    {
      icon: LogoGoogle,
      label: 'Container Registry | Google Cloud',
      path: 'registry-linux',
    },
    {
      icon: mode === 'dark' ? LogoAwsWhite : LogoAws,
      label: 'Amazon Elastic Container Registry',
      path: 'registry-k8',
    },
    {
      icon: LogoAzureRegistry,
      label: 'Azure Container Registry',
      path: 'registry-azure-1',
    },
    {
      icon: LogoGoogle,
      label: 'Container Registry | Google Cloud',
      path: 'registry-linux-1',
    },
  ];
  return (
    <>
      <div className="py-4 items-center flex px-6">
        <img
          src={LogoRegistryConnector}
          alt="Cloud Connector"
          width="28"
          height="28"
          className="pr-2"
        />
        <span
          className={`${Typography.size['2xl']} ${Typography.weight.medium} leading-[29px] dark:text-gray-50`}
        >
          Registry
        </span>
      </div>
      <div className="mb-4">
        <p
          className={`px-6 ${Typography.size.sm} ${Typography.weight.normal} leading-6 text-gray-700 dark:text-gray-400 min-h-[110px]`}
        >
          Connect a registry to scan images for vulnerabilities.
          <br></br>
          &nbsp;
        </p>
        <div className="flex flex-col">
          {connectors.map((connector) => {
            return (
              <div
                key={connector.path}
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

export const AddConnector = () => {
  const { navigate } = usePageNavigation();
  const navigatedRef = useRef(false);

  return (
    <Tabs
      value={'add-connectors'}
      tabs={connectorLayoutTabs}
      onValueChange={() => {
        if (navigatedRef.current) return;
        navigatedRef.current = true;
        navigate(`/onboard/connectors/my-connectors`);
      }}
      size="md"
    >
      <div className="h-full dark:text-white mt-8">
        <div className="grid grid-cols-1 gap-4 gap-y-6 lg:grid-cols-3 sm:grid-cols-2">
          <Card className="dark:border-0">
            <Cloud />
          </Card>
          <Card className="dark:border-0">
            <Host />
          </Card>
          <Card className="dark:border-0">
            <Registries />
          </Card>
        </div>
      </div>
    </Tabs>
  );
};
