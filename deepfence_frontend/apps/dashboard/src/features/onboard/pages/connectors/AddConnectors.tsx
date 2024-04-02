import { useRef } from 'react';
import { useState } from 'react';
import { useMemo } from 'react';
import { generatePath } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import { Button, Card, Tabs } from 'ui-components';

import { ACCOUNT_CONNECTOR } from '@/components/hosts-connector/NoConnectors';
import { ArrowLine } from '@/components/icons/common/ArrowLine';
import { CloudLine } from '@/components/icons/common/CloudLine';
import { HostIcon } from '@/components/icons/host';
import { AWSECSEC2Icon } from '@/components/icons/hosts/AWSECSEC2';
import { AwsIcon } from '@/components/icons/posture/Aws';
import { AzureIcon } from '@/components/icons/posture/Azure';
import { GoogleIcon } from '@/components/icons/posture/Google';
import { KubernetesIcon } from '@/components/icons/posture/Kubernetes';
import { LinuxIcon } from '@/components/icons/posture/Linux';
import { DockerRegistryIcon } from '@/components/icons/registries/Docker';
import { HarborRegistryIcon } from '@/components/icons/registries/Harbor';
import { JfrogRegistryIcon } from '@/components/icons/registries/Jfrog';
import { QuayRegistryIcon } from '@/components/icons/registries/Quay';
import { RegistryIcon } from '@/components/sideNavigation/icons/Registry';
import { connectorLayoutTabs } from '@/features/onboard/layouts/ConnectorsLayout';
import { RegistryType } from '@/types/common';
import { usePageNavigation } from '@/utils/usePageNavigation';

interface CardConnectProps {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const CardConnect = ({ label, path, icon }: CardConnectProps) => {
  const { navigate } = usePageNavigation();
  const handleSelection = () => {
    navigate(
      generatePath(`../../instructions/:connectorType`, {
        connectorType: encodeURIComponent(path),
      }),
    );
  };

  return (
    <div className="px-6">
      <button
        className={cn(
          'text-sm text-left flex items-center w-full gap-5',
          'border-b dark:border-bg-grid-border border-gray-200 h-[72px]  dark:hover:text-text-input-value dark:bg-transparent',
        )}
        onClick={handleSelection}
      >
        <div className="w-10 h-10">{icon}</div>
        <div className="whitespace-nowrap overflow-hidden text-ellipsis">{label}</div>
        <span className="w-6 h-6 ml-auto text-text-icon">
          <ArrowLine className="rotate-90" />
        </span>
      </button>
    </div>
  );
};

const Cloud = () => {
  const connectors = [
    {
      icon: <AwsIcon />,
      label: 'Amazon Web Services (AWS)',
      path: ACCOUNT_CONNECTOR.AWS,
    },
    {
      icon: <GoogleIcon />,
      label: 'Google Cloud Platform',
      path: ACCOUNT_CONNECTOR.GCP,
    },
    {
      icon: <AzureIcon />,
      label: 'Microsoft Azure',
      path: ACCOUNT_CONNECTOR.AZURE,
    },
  ];
  return (
    <>
      <div className="py-4 items-center flex px-6 gap-x-2">
        <span className="w-6 h-6 text-accent-accent">
          <CloudLine />
        </span>
        <span className="text-text-text-and-icon text-h2">Cloud</span>
      </div>
      <div className="mb-4">
        <p className={`px-6 text-p4 text-text-text-and-icon min-h-[110px]`}>
          Connect an AWS, GCP, or Azure cloud account to check for compliance
          misconfigurations.
        </p>
        <div className="flex flex-col text-text-text-and-icon">
          {connectors.map((connector) => {
            return (
              <div
                key={connector.label}
                className="dark:hover:bg-bg-hover-2 hover:bg-bg-breadcrumb-bar"
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
  const [showAll, setShowAll] = useState(false);

  const hostConnectors = [
    {
      icon: <KubernetesIcon />,
      label: 'Kubernetes Clusters',
      path: ACCOUNT_CONNECTOR.KUBERNETES,
    },
    {
      icon: <DockerRegistryIcon />,
      label: 'Docker Container',
      path: ACCOUNT_CONNECTOR.DOCKER,
    },
    {
      icon: <LinuxIcon />,
      label: 'Linux Bare-Metal/VM',
      path: ACCOUNT_CONNECTOR.LINUX,
    },
    {
      icon: (
        <div className="text-orange-400">
          <AWSECSEC2Icon />
        </div>
      ),
      label: 'AWS ECS (EC2 Provider)',
      path: ACCOUNT_CONNECTOR.AWS_ECS,
    },
  ];

  const onShowAll = () => {
    setShowAll((state) => {
      return !state;
    });
  };

  const connectors = useMemo(() => {
    if (showAll) {
      return [...hostConnectors];
    } else {
      return [...hostConnectors.slice(0, 3)];
    }
  }, [showAll]);

  return (
    <>
      <div className="py-4 items-center flex px-6 gap-x-2">
        <span className="w-6 h-6 text-accent-accent">
          <HostIcon />
        </span>
        <span className="text-text-text-and-icon text-h2">Host</span>
      </div>
      <div className="mb-4">
        <p className={`px-6 text-p4 text-text-text-and-icon min-h-[110px]`}>
          Connect a K8s cluster, Docker container, or Linux host to check for
          vulnerabilities, secrets, malware, and compliance misconfigurations.
        </p>
        <div className="flex flex-col text-text-text-and-icon">
          {connectors.map((connector) => {
            return (
              <div
                key={connector.label}
                className="dark:hover:bg-bg-hover-2 hover:bg-bg-breadcrumb-bar"
              >
                <CardConnect {...connector} />
              </div>
            );
          })}
          {!showAll ? (
            <Button size="sm" onClick={onShowAll} className="mx-6 mt-2">
              +1 more
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
};

const Registries = () => {
  const [showAll, setShowAll] = useState(false);

  const registriesConnectors = [
    {
      icon: <AwsIcon />,
      label: 'Amazon Elastic Container Registry',
      path: RegistryType.ecr,
    },
    {
      icon: <AzureIcon />,
      label: 'Azure Container Registry',
      path: RegistryType.azure_container_registry,
    },
    {
      icon: <GoogleIcon />,
      label: 'Container Registry | Google Cloud',
      path: RegistryType.google_container_registry,
    },
    {
      icon: <DockerRegistryIcon />,
      label: 'Docker Container Registry',
      path: RegistryType.docker_hub,
    },
    {
      icon: <DockerRegistryIcon />,
      label: 'Docker Container Registry | Self Hosted',
      path: RegistryType.docker_private_registry,
    },
    {
      icon: <QuayRegistryIcon />,
      label: 'Quay Container Registry',
      path: RegistryType.quay,
    },
    {
      icon: <HarborRegistryIcon />,
      label: 'Harbor Container Registry',
      path: RegistryType.harbor,
    },
    {
      icon: <JfrogRegistryIcon />,
      label: 'Smarter Docker Registry | JFrog',
      path: RegistryType.jfrog_container_registry,
    },
    {
      icon: <GoogleIcon />,
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
      <div className="py-4 items-center flex px-6 gap-x-2">
        <span className="w-6 h-6 text-accent-accent">
          <RegistryIcon />
        </span>
        <span className="text-text-text-and-icon text-h2">Registry</span>
      </div>
      <div className="mb-4">
        <p className="px-6 text-p4 text-text-text-and-icon min-h-[110px]">
          Connect a registry to scan images for vulnerabilities.
          <br></br>
          &nbsp;
        </p>
        <div className="flex flex-col text-text-text-and-icon">
          {connectors.map((connector) => {
            return (
              <div
                key={connector.path}
                className="dark:hover:bg-bg-hover-2 hover:bg-bg-breadcrumb-bar"
              >
                <CardConnect {...connector} />
              </div>
            );
          })}
          {!showAll ? (
            <Button size="sm" onClick={onShowAll} className="mx-6 mt-2">
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
