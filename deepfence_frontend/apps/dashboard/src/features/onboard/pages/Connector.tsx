import { has } from 'lodash-es';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from 'ui-components';

import { AWSCloudFormation } from '@/components/clouds-connector/AWSCloudFormation';
import { AWSTerraform } from '@/components/clouds-connector/AWSTerraform';
import { AzureConnectorForm } from '@/components/clouds-connector/AzureConnectorForm';
import { GCPConnectorForm } from '@/components/clouds-connector/GCPConnectorForm';
import { AWSECSEC2ConnectorForm } from '@/components/hosts-connector/AWSECSEC2ConnectorForm';
import { DockerConnectorForm } from '@/components/hosts-connector/DockerConnectorForm';
import { K8ConnectorForm } from '@/components/hosts-connector/K8ConnectorForm';
import { LinuxConnectorForm } from '@/components/hosts-connector/LinuxConnectorForm';
import { ACCOUNT_CONNECTOR } from '@/components/hosts-connector/NoConnectors';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { RegistriesConnector } from '@/features/onboard/pages/RegistriesConnector';
import { RegistryType } from '@/types/common';
import { usePageNavigation } from '@/utils/usePageNavigation';

const Connector = () => {
  const { goBack, navigate } = usePageNavigation();

  let title = '';
  let description = '';

  const { connectorType } = useParams() as {
    connectorType: string;
  };

  if (ACCOUNT_CONNECTOR.DOCKER === connectorType) {
    title = 'Connect a Docker Container';
    description = 'Deploy all modules for Deepfence Scanner at your docker container.';
  } else if (ACCOUNT_CONNECTOR.KUBERNETES === connectorType) {
    title = 'Connect a Kubernetes Cluster';
    description = 'Deploy all modules for Deepfence Scanner at your kubernetes cluster.';
  } else if (ACCOUNT_CONNECTOR.LINUX === connectorType) {
    title = 'Connect a Linux Machine';
    description = 'Deploy all modules for Deepfence Scanner at your linux machine.';
  } else if (ACCOUNT_CONNECTOR.AWS === connectorType) {
    title = 'Connect to Amazon Web Services';
    description = 'Deploy all modules for Deepfence Scanner at your aws cloud.';
  } else if (ACCOUNT_CONNECTOR.AWS_ECS === connectorType) {
    title = 'Connect AWS ECS (EC2 Provider)';
    description = '';
  } else if (ACCOUNT_CONNECTOR.AZURE === connectorType) {
    title = 'Connect to Azure Cloud';
    description = 'Deploy all modules for Deepfence Scanner at your azure cloud.';
  } else if (ACCOUNT_CONNECTOR.GCP === connectorType) {
    title = 'Connect to Google Cloud';
    description =
      'Deploy all modules for Deepfence Scanner at your google cloud platform.';
  } else if (RegistryType.azure_container_registry === connectorType) {
    title = 'Connect to Azure Container Registry';
    description = '';
  } else if (RegistryType.docker_hub === connectorType) {
    title = 'Connect to Docker Container Registry';
    description = '';
  } else if (RegistryType.docker_private_registry === connectorType) {
    title = 'Connect to Docker Container Private Registry';
    description = '';
  } else if (RegistryType.ecr === connectorType) {
    title = 'Connect to Amazon Elastic Container Registry';
    description = '';
  } else if (RegistryType.gitlab === connectorType) {
    title = 'Connect to GitLab Registry';
    description = '';
  } else if (RegistryType.google_container_registry === connectorType) {
    title = 'Connect to Google Registry';
    description = '';
  } else if (RegistryType.harbor === connectorType) {
    title = 'Connect to Harbor Registry';
    description = '';
  } else if (RegistryType.jfrog_container_registry === connectorType) {
    title = 'Connect to JFrog Registry';
    description = '';
  } else if (RegistryType.quay === connectorType) {
    title = 'Connect to Quay Registry';
    description = '';
  }

  const isRegistryConnector = useMemo(
    () => has(RegistryType, connectorType),
    [connectorType],
  );

  return (
    <div className="w-full">
      <ConnectorHeader title={title} description={description} />
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

      {isRegistryConnector ? (
        <RegistriesConnector />
      ) : (
        <>
          <div className="mt-8 flex items-center sticky bottom-0 py-4 bg-bg-page gap-x-4">
            <div className="flex items-center gap-x-2">
              <Button
                size="md"
                type="button"
                onClick={() => {
                  navigate('/onboard/connectors/my-connectors');
                }}
              >
                Go to connectors
              </Button>
              <Button onClick={goBack} type="button" variant="outline" size="md">
                Cancel
              </Button>
            </div>
            <p className="text-p7 text-text-text-and-icon">
              Note: After completing the steps above, your connector will appear on
              MyConnector page and you will be able to scan them.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export const module = {
  element: <Connector />,
  meta: { title: 'Connect Account' },
};
