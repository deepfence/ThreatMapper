import { has } from 'lodash-es';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from 'ui-components';

import { AWSCloudFormation } from '@/components/clouds-connector/AWSCloudFormation';
import { AWSTerraform } from '@/components/clouds-connector/AWSTerraform';
import { AzureConnectorForm } from '@/components/clouds-connector/AzureConnectorForm';
import { GCPConnectorForm } from '@/components/clouds-connector/GCPConnectorForm';
import { DockerConnectorForm } from '@/components/hosts-connector/DockerConnectorForm';
import { K8ConnectorForm } from '@/components/hosts-connector/K8ConnectorForm';
import { LinuxConnectorForm } from '@/components/hosts-connector/LinuxConnectorForm';
import { ACCOUNT_CONNECTOR } from '@/components/hosts-connector/NoConnectors';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { RegistriesConnector } from '@/features/onboard/pages/RegistriesConnector';
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
    description =
      'Deploy all modules for Deepfence Compliance Scanner at your docker container.';
  }

  const isRegistryConnector = useMemo(
    () => !has(ACCOUNT_CONNECTOR, connectorType),
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

      {isRegistryConnector ? (
        <RegistriesConnector />
      ) : (
        <>
          <div className="flex flex-col mb-6 ml-14">
            <p className="text-xs">
              Note: After successfully run the commands above, your connector will appear
              on MyConnector page, then you can perform scanning.
            </p>
          </div>
          <div className="flex">
            <Button onClick={goBack} size="xs" type="button">
              Go Back
            </Button>
            <div className="flex items-center ml-auto">
              <Button
                color="primary"
                size="xs"
                className="ml-auto"
                type="submit"
                onClick={() => {
                  navigate('/onboard/connectors/my-connectors');
                }}
              >
                Go to connectors
              </Button>
            </div>
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
