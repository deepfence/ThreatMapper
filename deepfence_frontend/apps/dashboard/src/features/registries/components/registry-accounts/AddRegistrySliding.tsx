import { FaPlus } from 'react-icons/fa';

import { AddAzureForm } from '@/features/registries/components/registry-accounts/Azure';
import { AddDockerHubForm } from '@/features/registries/components/registry-accounts/Docker';
import { AddDockerHubPrivateForm } from '@/features/registries/components/registry-accounts/DockerPrivate';
import { AddECRForm } from '@/features/registries/components/registry-accounts/ECR';
import { AddGCRForm } from '@/features/registries/components/registry-accounts/GCR';
import { AddQuayForm } from '@/features/registries/components/registry-accounts/Quay';

export const AddRegistry = ({ account }: { account: string }) => {
  // return according to type using switch case
  switch (account) {
    case 'ecr':
      return <AddECRForm />;
    case 'docker':
      return <AddDockerHubForm />;
    case 'gcr':
      return <AddGCRForm />;
    case 'azure':
      return <AddAzureForm />;
    case 'dockerhub_private':
      return <AddDockerHubPrivateForm />;
    case 'quay':
      return <AddQuayForm />;
    default:
      return <AddDockerHubForm />;
  }
};

export const AddRegistryHeader = () => {
  // header with icon
  return (
    <div className="flex">
      <FaPlus /> Add Registry
    </div>
  );
};
