import cx from 'classnames';
import { useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { HiOutlineArrowCircleRight } from 'react-icons/hi';
import { Card, Tabs, Typography } from 'ui-components';

import LogoAws from '../../../assets/logo-aws.svg';
import LogoAwsWhite from '../../../assets/logo-aws-white.svg';
import LogoAzure from '../../../assets/logo-azure.svg';
import LogoAzureRegistry from '../../../assets/logo-azure-registry.svg';
import LogoCloudConnector from '../../../assets/logo-cloud-connector.svg';
import LogoDocker from '../../../assets/logo-docker.svg';
import LogoGoogle from '../../../assets/logo-google.svg';
import LogoHostConnector from '../../../assets/logo-host-connector.svg';
import LogoK8 from '../../../assets/logo-k8.svg';
import LogoLinux from '../../../assets/logo-linux.svg';
import LogoRegistryConnector from '../../../assets/logo-registry-connector.svg';
import { useTheme } from '../../../theme/ThemeContext';
import { usePageNavigation } from '../../../utils/usePageNavigation';
import { ConnectorHeader } from '../components/ConnectorHeader';
import { NoConnectors } from '../components/connectors/NoConnectors';

interface CardConnectProps {
  path: string;
  label: string;
  icon: string;
}

const CardConnect = ({ label, path, icon }: CardConnectProps) => {
  const { navigate } = usePageNavigation();
  const handleSelection = () => {
    navigate(`${path}`);
  };

  return (
    <div className="px-6">
      <button
        className={cx(
          'text-sm text-left flex items-center w-full',
          'border-b dark:border-gray-700 border-gray-200 h-[72px] dark:text-gray-300 dark:bg-transparent',
        )}
        onClick={handleSelection}
      >
        <img src={icon} alt="Cloud Connector" height="32" className="mr-6" />
        {label}
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
    <Card className={cx(`w-full sm:w-1/3 dark:border-0`)}>
      <div className="py-4 items-center flex pl-6">
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
      <div>
        <p
          className={`pl-6 ${Typography.size.sm} ${Typography.weight.normal} leading-6 text-gray-700 dark:text-gray-400`}
        >
          Connect an AWS, GCP, or Azure cloud account to check for compliance
          misconfigurations.
        </p>
        <div className="flex flex-col mt-10">
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
    </Card>
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
      path: 'docker',
    },
    {
      icon: LogoLinux,
      label: 'Linux Bare-Metal/VM',
      path: 'host-linux',
    },
  ];

  return (
    <Card className="w-full sm:w-1/3 dark:border-0">
      <div className="py-4 items-center flex pl-6">
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
      <div>
        <p
          className={`pl-6 ${Typography.size.sm} ${Typography.weight.normal} leading-6 text-gray-700 dark:text-gray-400`}
        >
          Connect a K8s cluster, Docker container, or Linux host to check for
          vulnerabilities, secrets, malware, and compliance misconfigurations.
        </p>
        <div className="flex flex-col mt-10">
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
    </Card>
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
      path: 'registry-azure',
    },
    {
      icon: LogoGoogle,
      label: 'Container Registry | Google Cloud',
      path: 'registry-linux',
    },
  ];
  return (
    <Card className="w-full sm:w-1/3 dark:border-0">
      <div className="py-4 items-center flex pl-6">
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
      <div>
        <p
          className={`pl-6 ${Typography.size.sm} ${Typography.weight.normal} leading-6 text-gray-700 dark:text-gray-400`}
        >
          Connect a registry to scan images for vulnerabilities.
          <br></br>
          &nbsp;
        </p>
        <div className="flex flex-col mt-10">
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
    </Card>
  );
};

const tabs = [
  {
    label: 'Add Connectors',
    value: 'add-connectors',
  },
  {
    label: 'My Connectors',
    value: 'my-connectors',
  },
];

export const AddConnector = () => {
  return (
    <div className="flex flex-col sm:flex-row gap-x-2">
      <Cloud />
      <Host />
      <Registries />
    </div>
  );
};

export const Connector = ({ page }: { page: string }) => {
  const [tab, setTab] = useState(page);
  const { navigate } = usePageNavigation();

  const onTabChange = (tab: string) => {
    navigate(`/onboard/${tab}`);
  };

  useEffect(() => {
    if (page) {
      setTab(page);
    }
  }, [page]);
  return (
    <>
      <ConnectorHeader
        title="Let's Get Started"
        description="ThreatMapper’s unique approach learns the active topology of your application and classifies vulnerabilities based on the attack surfaces that your application presents."
      />
      <Tabs
        value={tab}
        defaultValue={tab}
        tabs={tabs}
        onValueChange={onTabChange}
        size="md"
      >
        <div className="h-full dark:text-white mt-8">
          {tab === 'add-connectors' && <AddConnector />}
          {tab === 'my-connectors' && (
            <>
              <NoConnectors />
            </>
          )}
        </div>
      </Tabs>
    </>
  );
};
