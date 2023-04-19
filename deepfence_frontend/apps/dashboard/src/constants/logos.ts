import { SearchNodeCountResp } from '@/api/generated';
import AwsSecurityHub from '@/assets/aws_security_hub.svg';
import ElasticSearch from '@/assets/elasticsearch.svg';
import GoogleChronicle from '@/assets/google_chronical.svg';
import HttpEndpoint from '@/assets/http_endpoint.svg';
import Jira from '@/assets/jira.svg';
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
import MicrosoftTeams from '@/assets/microsoft_teams.svg';
import PagerDuty from '@/assets/pagerduty.svg';
import S3 from '@/assets/s3.svg';
import Slack from '@/assets/slack.svg';
import Splunk from '@/assets/splunk.svg';
import SumoLogic from '@/assets/sumologic.svg';
import { CloudIcon } from '@/components/icons/cloud';
import { ContainerIcon } from '@/components/icons/container';
import { HostIcon } from '@/components/icons/host';
import { ImageIcon } from '@/components/icons/image';
import { K8sIcon } from '@/components/icons/k8s';
import { NamespaceIcon } from '@/components/icons/namespace';
import { PodIcon } from '@/components/icons/pod';
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
      icon: mode === 'dark' ? LogoAwsWhite : LogoAWS,
    },
    aws_org: {
      label: 'AWS Organizations',
      icon: mode === 'dark' ? LogoAwsWhite : LogoAWS,
    },
    azure: {
      label: 'Azure',
      icon: LogoAzure,
    },
    gcp: {
      label: 'GCP',
      icon: LogoGoogle,
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

export function getNodesIcon(nodeType: keyof SearchNodeCountResp) {
  const map: Record<typeof nodeType, () => JSX.Element> = {
    cloud_provider: CloudIcon,
    container: ContainerIcon,
    host: HostIcon,
    container_image: ImageIcon,
    kubernetes_cluster: K8sIcon,
    namespace: NamespaceIcon,
    pod: PodIcon,
  };

  return map[nodeType];
}

export {
  AwsSecurityHub,
  ElasticSearch,
  GoogleChronicle,
  HttpEndpoint,
  Jira,
  MicrosoftTeams,
  PagerDuty,
  S3,
  Slack,
  Splunk,
  SumoLogic,
};
