import { RegistryType } from '@/types/common';

import { AmazonECRRegistryIcon } from './AmazonEcr';
import { AzureRegistryIcon } from './Azure';
import { DockerRegistryIcon } from './Docker';
import { GitlabRegistryIcon } from './Gitlab';
import { GoogleRegistryIcon } from './Google';
import { HarborRegistryIcon } from './Harbor';
import { JfrogRegistryIcon } from './Jfrog';
import { QuayRegistryIcon } from './Quay';

const iconDimension = 'w-[40px] h-[40px]';

export const RegistryLogos = ({
  registryType,
}: {
  registryType: keyof typeof RegistryType;
}) => {
  if (registryType === RegistryType.azure_container_registry) {
    return (
      <div className={iconDimension}>
        <AzureRegistryIcon />
      </div>
    );
  } else if (registryType === RegistryType.docker_hub) {
    return (
      <div className={iconDimension}>
        <DockerRegistryIcon />
      </div>
    );
  } else if (registryType === RegistryType.docker_private_registry) {
    return (
      <div className={iconDimension}>
        <DockerRegistryIcon />
      </div>
    );
  } else if (registryType === RegistryType.ecr) {
    return (
      <div className={iconDimension}>
        <AmazonECRRegistryIcon />
      </div>
    );
  } else if (registryType === RegistryType.gitlab) {
    return (
      <div className={iconDimension}>
        <GitlabRegistryIcon />
      </div>
    );
  } else if (registryType === RegistryType.google_container_registry) {
    return (
      <div className={iconDimension}>
        <GoogleRegistryIcon />
      </div>
    );
  } else if (registryType === RegistryType.harbor) {
    return (
      <div className={iconDimension}>
        <HarborRegistryIcon />
      </div>
    );
  } else if (registryType === RegistryType.jfrog_container_registry) {
    return (
      <div className={iconDimension}>
        <JfrogRegistryIcon />
      </div>
    );
  } else if (registryType === RegistryType.quay) {
    return (
      <div className={iconDimension}>
        <QuayRegistryIcon />
      </div>
    );
  }
  return null;
};
