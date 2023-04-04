import LogoAws from '@/assets/logo-aws.svg';
import LogoAWS from '@/assets/logo-aws.svg';
import LogoAwsWhite from '@/assets/logo-aws-white.svg';
import LogoAzure from '@/assets/logo-azure.svg';
import LogoAzureRegistry from '@/assets/logo-azure-registry.svg';
import LogoDocker from '@/assets/logo-docker.svg';
import LogoGitlab from '@/assets/logo-gitlab.svg';
import LogoGoogle from '@/assets/logo-google.svg';
import LogoHarbor from '@/assets/logo-harbor.svg';
import LogoJFrog from '@/assets/logo-jfrog.svg';
import LogoK8 from '@/assets/logo-k8.svg';
import LogoLinux from '@/assets/logo-linux.svg';
import LogoQuay from '@/assets/logo-quay.svg';
import { Mode } from '@/theme/ThemeContext';
import { RegistryType } from '@/types/common';

export const getPostureLogo = (accountType: string, mode: Mode) => {
  const map: {
    [k: string]: {
      label: string;
      icon: string;
    };
  } = {
    aws: {
      label: 'AWS',
      icon: mode === 'dark' ? LogoAwsWhite : LogoAws,
    },
    aws_org: {
      label: 'AWS Organizations',
      icon: mode === 'dark' ? LogoAwsWhite : LogoAws,
    },
    azure: {
      label: 'Azure',
      icon: LogoGoogle,
    },
    gcp: {
      label: 'GCP',
      icon: LogoAzure,
    },
    kubernetes: {
      label: 'Kubernetes',
      icon: LogoK8,
    },
    linux: {
      label: 'Linux Hosts',
      icon: LogoLinux,
    },
  };
  return map[accountType];
};

export const getRegistryLogo = (registryType: keyof typeof RegistryType, mode: Mode) => {
  let icon = '';
  let name = '';
  if (registryType === RegistryType.azure_container_registry) {
    icon = LogoAzureRegistry;
    name = 'Azure Registry';
  } else if (registryType === RegistryType.docker_hub) {
    icon = LogoDocker;
    name = 'Docker Registry';
  } else if (registryType === RegistryType.docker_private_registry) {
    icon = LogoDocker;
    name = 'Docker Private Registry';
  } else if (registryType === RegistryType.ecr) {
    icon = mode === 'light' ? LogoAWS : LogoAwsWhite;
    name = 'Amazon ECR';
  } else if (registryType === RegistryType.gitlab) {
    icon = LogoGitlab;
    name = 'Gitlab Registry';
  } else if (registryType === RegistryType.google_container_registry) {
    icon = LogoGoogle;
    name = 'Google Registry';
  } else if (registryType === RegistryType.harbor) {
    icon = LogoHarbor;
    name = 'Harbor Registry';
  } else if (registryType === RegistryType.jfrog_container_registry) {
    icon = LogoJFrog;
    name = 'JFrog Registry';
  } else if (registryType === RegistryType.quay) {
    icon = LogoQuay;
    name = 'Quay Registry';
  }

  return {
    icon,
    name,
  };
};
