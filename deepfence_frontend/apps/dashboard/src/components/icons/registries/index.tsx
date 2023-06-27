import { RegistryType } from '@/types/common';

import { AmazonECRRegistryIcon } from './AmazonEcr';
import { AzureRegistryIcon } from './Azure';
import { DockerRegistryIcon } from './Docker';
import { GitlabRegistryIcon } from './Gitlab';
import { GoogleRegistryIcon } from './Google';
import { HarborRegistryIcon } from './Harbor';
import { JfrogRegistryIcon } from './Jfrog';
import { QuayRegistryIcon } from './Quay';

export const RegistryLogos = ({
  registryType,
}: {
  registryType: keyof typeof RegistryType;
}) => {
  if (registryType === RegistryType.azure_container_registry) {
    return <AzureRegistryIcon />;
  } else if (registryType === RegistryType.docker_hub) {
    return <DockerRegistryIcon />;
  } else if (registryType === RegistryType.docker_private_registry) {
    return <DockerRegistryIcon />;
  } else if (registryType === RegistryType.ecr) {
    return <AmazonECRRegistryIcon />;
  } else if (registryType === RegistryType.gitlab) {
    return <GitlabRegistryIcon />;
  } else if (registryType === RegistryType.google_container_registry) {
    return <GoogleRegistryIcon />;
  } else if (registryType === RegistryType.harbor) {
    return <HarborRegistryIcon />;
  } else if (registryType === RegistryType.jfrog_container_registry) {
    return <JfrogRegistryIcon />;
  } else if (registryType === RegistryType.quay) {
    return <QuayRegistryIcon />;
  }
  return null;
};
