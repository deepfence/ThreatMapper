import cx from 'classnames';
import { useRef } from 'react';
import { useState } from 'react';
import { useMemo } from 'react';
import { IconContext } from 'react-icons';
import { HiOutlineArrowCircleRight } from 'react-icons/hi';
import { generatePath } from 'react-router-dom';
import { Button, Card, Tabs, Typography } from 'ui-components';

import LogoAws from '@/assets/logo-aws.svg';
import LogoAwsWhite from '@/assets/logo-aws-white.svg';
import LogoAzure from '@/assets/logo-azure.svg';
import LogoAzureRegistry from '@/assets/logo-azure-registry.svg';
import LogoCloudConnector from '@/assets/logo-cloud-connector.svg';
import LogoDocker from '@/assets/logo-docker.svg';
import LogoGoogle from '@/assets/logo-google.svg';
import LogoHarbor from '@/assets/logo-harbor.svg';
import LogoHostConnector from '@/assets/logo-host-connector.svg';
import LogoJFrog from '@/assets/logo-jfrog.svg';
import LogoK8 from '@/assets/logo-k8.svg';
import LogoLinux from '@/assets/logo-linux.svg';
import LogoQuay from '@/assets/logo-quay.svg';
import LogoRegistryConnector from '@/assets/logo-registry-connector.svg';
import { ACCOUNT_CONNECTOR } from '@/components/hosts-connector/NoConnectors';
import { connectorLayoutTabs } from '@/features/onboard/layouts/ConnectorsLayout';
import { useTheme } from '@/theme/ThemeContext';
import { RegistryType } from '@/types/common';
import { usePageNavigation } from '@/utils/usePageNavigation';

interface CardConnectProps {
  path: string;
  label: string;
  icon: string;
}

const CardConnect = ({ label, path, icon }: CardConnectProps) => {
  const { navigate } = usePageNavigation();
  const handleSelection = () => {
    navigate(
      generatePath(`../../instructions/:connectorType`, {
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
  const [showAll, setShowAll] = useState(false);

  const registriesConnectors = [
    {
      icon: mode === 'dark' ? LogoAwsWhite : LogoAws,
      label: 'Amazon Elastic Container Registry',
      path: RegistryType.ecr,
    },
    {
      icon: LogoAzureRegistry,
      label: 'Azure Container Registry',
      path: RegistryType.azure_container_registry,
    },
    {
      icon: LogoGoogle,
      label: 'Container Registry | Google Cloud',
      path: RegistryType.google_container_registry,
    },
    {
      icon: LogoDocker,
      label: 'Docker Container Registry',
      path: RegistryType.docker_hub,
    },
    {
      icon: LogoAzureRegistry,
      label: 'Docker Container Registry | Self Hosted',
      path: RegistryType.docker_private_registry,
    },
    {
      icon: LogoQuay,
      label: 'Quay Container Registry',
      path: RegistryType.quay,
    },
    {
      icon: LogoHarbor,
      label: 'Harbor Container Registry',
      path: RegistryType.harbor,
    },
    {
      icon: LogoJFrog,
      label: 'Smarter Docker Registry | JFrog',
      path: RegistryType.jfrog_container_registry,
    },
    {
      icon: LogoGoogle,
      label: 'GitLab Container Registry',
      path: RegistryType.gitlab,
    },
  ];
  const onShowAll = () => {
    setShowAll((state) => {
      return !state;
    });
  };

  const connectors = useMemo(() => {
    if (showAll) {
      return [...registriesConnectors];
    } else {
      return [...registriesConnectors.slice(0, 3)];
    }
  }, [showAll]);

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
          {!showAll ? (
            <Button
              size="sm"
              onClick={onShowAll}
              className="bg-transparent hover:bg-transparent ml-3 mt-2"
            >
              +6 more
            </Button>
          ) : null}
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
