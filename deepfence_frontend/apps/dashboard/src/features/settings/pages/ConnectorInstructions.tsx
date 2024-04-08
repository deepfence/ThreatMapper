import { useMemo, useState } from 'react';
import { generatePath, useParams } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import { Button, Card } from 'ui-components';

import { AWSCloudFormation } from '@/components/clouds-connector/AWSCloudFormation';
import { AWSTerraform } from '@/components/clouds-connector/AWSTerraform';
import { AzureConnectorForm } from '@/components/clouds-connector/AzureConnectorForm';
import { GCPConnectorForm } from '@/components/clouds-connector/GCPConnectorForm';
import { DFLink } from '@/components/DFLink';
import { AWSECSEC2ConnectorForm } from '@/components/hosts-connector/AWSECSEC2ConnectorForm';
import { DockerConnectorForm } from '@/components/hosts-connector/DockerConnectorForm';
import { K8ConnectorForm } from '@/components/hosts-connector/K8ConnectorForm';
import { LinuxConnectorForm } from '@/components/hosts-connector/LinuxConnectorForm';
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
import { usePageNavigation } from '@/utils/usePageNavigation';

interface CardConnectProps {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const ACCOUNT_CONNECTOR_TITLE: { [k: string]: string } = {
  docker: 'Connect a Docker Container',
  aws: 'Connect to Amazon Web Services',
  gcp: 'Connect to Google Cloud',
  azure: 'Connect to Azure Cloud',
  linux: 'Connect a Linux Machine',
  host: 'Host',
  kubernetes: 'Connect a Kubernetes Cluster',
  cluster: 'Cluster',
  aws_ecs: 'Connect AWS ECS (EC2 Provider)',
} as const;

const CardConnect = ({ label, path, icon }: CardConnectProps) => {
  const { navigate } = usePageNavigation();
  const handleSelection = () => {
    navigate(
      generatePath(`../../settings/connection-instructions/:connectorType`, {
        connectorType: encodeURIComponent(path),
      }),
    );
  };

  return (
    <div className="px-6">
      <button
        className={cn(
          'text-sm text-left flex items-center w-full gap-5',
          'border-b dark:border-gray-700 border-gray-200 h-[72px] dark:text-gray-300 dark:bg-transparent',
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
        <span className="w-6 h-6 dark:text-accent-accent">
          <CloudLine />
        </span>
        <span className={`text-2xl font-medium leading-[29px] dark:text-gray-50`}>
          Cloud
        </span>
      </div>
      <div className="mb-4">
        <p className={`px-6 text-p1a text-text-text-and-icon min-h-[110px]`}>
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
        <span className="w-6 h-6 dark:text-accent-accent">
          <HostIcon />
        </span>
        <span className={`text-2xl font-medium leading-[29px] dark:text-gray-50`}>
          Host
        </span>
      </div>
      <div className="mb-4">
        <p className={`px-6 text-p1a text-text-text-and-icon min-h-[110px]`}>
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
const Instructions = ({ connectorType }: { connectorType: string }) => {
  return (
    <>
      <div className="my-2 flex gap-x-2 items-center">
        <DFLink to={'../connection-instructions'}>
          <div className="w-6 h-6 -rotate-90">
            <ArrowLine />
          </div>
        </DFLink>
        <h3 className="text-h4 text-text-input-value">
          {ACCOUNT_CONNECTOR_TITLE[connectorType]}
        </h3>
      </div>
      <div>
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
        {ACCOUNT_CONNECTOR.AWS_ECS === connectorType && <AWSECSEC2ConnectorForm />}
      </div>
    </>
  );
};
const Connectors = () => {
  return (
    <div className="max-w-[900px]">
      <div className="mt-2">
        <h3 className="text-h6 text-text-input-value">Connection instructions</h3>
      </div>
      <div className="h-full dark:text-white mt-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 sm:grid-cols-2">
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
