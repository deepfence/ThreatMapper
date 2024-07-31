import { RegistryKeyType, RegistryType } from '@/types/common';

export const getRegistryPrettyName = (registryType: RegistryKeyType) => {
  switch (registryType) {
    case RegistryType.azure_container_registry:
      return 'Azure Container';
    case RegistryType.docker_hub:
      return 'Docker';
    case RegistryType.docker_private_registry:
      return 'Docker Private';
    case RegistryType.ecr:
      return 'Amazon ECR';
    case RegistryType.gitlab:
      return 'GitLab';
    case RegistryType.google_container_registry:
      return 'Google';
    case RegistryType.harbor:
      return 'Harbor';
    case RegistryType.jfrog_container_registry:
      return 'JFrog';
    case RegistryType.quay:
      return 'Quay';

    default:
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = registryType;
      throw new Error(`Unhandled case: ${_exhaustiveCheck}`);
  }
};
