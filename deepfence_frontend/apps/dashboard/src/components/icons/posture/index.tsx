import { ModelCloudNodeAccountsListReqCloudProviderEnum } from '@/api/generated';
import { ShieldCheckSolidIcon } from '@/components/icons/posture/ShieldCheckSolid';
import { ShieldWarningSolidIcon } from '@/components/icons/posture/ShieldWarningSolid';
import { ShieldXSolidIcon } from '@/components/icons/posture/ShieldXSolid';
import { useTheme } from '@/theme/ThemeContext';

import { AwsIcon } from './Aws';
import { AzureIcon } from './Azure';
import { GoogleIcon } from './Google';
import { KubernetesIcon } from './Kubernetes';
import { LinuxIcon } from './Linux';

export const PostureLogos = ({ name }: { name: string }) => {
  if (name === ModelCloudNodeAccountsListReqCloudProviderEnum.Aws) {
    return <AwsIcon />;
  } else if (name === ModelCloudNodeAccountsListReqCloudProviderEnum.AwsOrg) {
    return <AwsIcon />;
  } else if (name === ModelCloudNodeAccountsListReqCloudProviderEnum.Azure) {
    return <AzureIcon />;
  } else if (name === ModelCloudNodeAccountsListReqCloudProviderEnum.GcpOrg) {
    return <GoogleIcon />;
  } else if (name === ModelCloudNodeAccountsListReqCloudProviderEnum.AzureOrg) {
    return <AzureIcon />;
  } else if (name === ModelCloudNodeAccountsListReqCloudProviderEnum.Gcp) {
    return <GoogleIcon />;
  } else if (name === ModelCloudNodeAccountsListReqCloudProviderEnum.Kubernetes) {
    return <KubernetesIcon />;
  } else if (name === ModelCloudNodeAccountsListReqCloudProviderEnum.Linux) {
    return <LinuxIcon />;
  }
  return null;
};

export const ComplianceIconByPercent = ({ percent }: { percent?: number | null }) => {
  const { mode: theme } = useTheme();
  if (!percent && percent !== 0) return <ShieldWarningSolidIcon theme={theme} />;

  if (percent >= 80 && percent <= 100) {
    return <ShieldCheckSolidIcon />;
  } else if (percent >= 30 && percent < 80) {
    return <ShieldWarningSolidIcon theme={theme} />;
  } else if (percent < 30) {
    return <ShieldXSolidIcon />;
  }
  return <div></div>;
};
