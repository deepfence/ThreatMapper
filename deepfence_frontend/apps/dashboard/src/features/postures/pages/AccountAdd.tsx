import { useParams } from 'react-router-dom';

import { AWSCloudFormation } from '@/components/clouds-connector/AWSCloudFormation';
import { AWSTerraform } from '@/components/clouds-connector/AWSTerraform';
import { AzureConnectorForm } from '@/components/clouds-connector/AzureConnectorForm';
import { GCPConnectorForm } from '@/components/clouds-connector/GCPConnectorForm';
import { DockerConnectorForm } from '@/components/hosts-connector/DockerConnectorForm';
import { K8ConnectorForm } from '@/components/hosts-connector/K8ConnectorForm';
import { LinuxConnectorForm } from '@/components/hosts-connector/LinuxConnectorForm';
import { ACCOUNT_CONNECTOR } from '@/components/hosts-connector/NoConnectors';

const AccountAdd = () => {
  const { account } = useParams() as {
    account: string;
  };

  if (!account) {
    throw new Error('Account Type is required');
  }

  return (
    <>
      {ACCOUNT_CONNECTOR.DOCKER === account && <DockerConnectorForm />}
      {ACCOUNT_CONNECTOR.KUBERNETES === account && <K8ConnectorForm />}
      {ACCOUNT_CONNECTOR.LINUX === account && <LinuxConnectorForm />}
      {account.startsWith(ACCOUNT_CONNECTOR.AWS) && (
        <div className="flex gap-x-2 flex-col sm:flex-row flex-1">
          <AWSCloudFormation />
          <AWSTerraform />
        </div>
      )}
      {ACCOUNT_CONNECTOR.AZURE === account && <AzureConnectorForm />}
      {account.startsWith(ACCOUNT_CONNECTOR.GCP) && <GCPConnectorForm />}
    </>
  );
};

export const module = {
  element: <AccountAdd />,
};
