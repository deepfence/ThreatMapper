import { AWSCloudFormation } from '@/features/onboard/components/connectors/clouds/AWSCloudFormation';
import { AWSTerraform } from '@/features/onboard/components/connectors/clouds/AWSTerraform';
import { AzureConnectorForm } from '@/features/onboard/components/connectors/clouds/AzureConnectorForm';
import { GCPConnectorForm } from '@/features/onboard/components/connectors/clouds/GCPConnectorForm';
import { K8ConnectorForm } from '@/features/onboard/components/connectors/hosts/K8ConnectorForm';
import { LinuxConnectorForm } from '@/features/onboard/components/connectors/hosts/LinuxConnectorForm';

const AddAWSAccount = () => {
  return (
    <div className="flex gap-x-2 flex-col sm:flex-row flex-1">
      <AWSCloudFormation />
      <AWSTerraform />
    </div>
  );
};

const AddAzureAccount = () => {
  return (
    <div className="flex gap-x-2 flex-col sm:flex-row flex-1">
      <AzureConnectorForm />
    </div>
  );
};

const AddGCPAccount = () => {
  return (
    <div className="flex gap-x-2 flex-col sm:flex-row flex-1">
      <GCPConnectorForm />
    </div>
  );
};

const AddKubernetesAccount = () => {
  return (
    <div className="flex gap-x-2 flex-col sm:flex-row flex-1">
      <K8ConnectorForm />
    </div>
  );
};

const AddHostAccount = () => {
  return (
    <div className="flex gap-x-2 flex-col sm:flex-row flex-1">
      <LinuxConnectorForm />
    </div>
  );
};

export const module = {
  aws: {
    element: <AddAWSAccount />,
  },
  azure: {
    element: <AddAzureAccount />,
  },
  gcp: {
    element: <AddGCPAccount />,
  },
  kubernetes: {
    element: <AddKubernetesAccount />,
  },
  host: {
    element: <AddHostAccount />,
  },
};
