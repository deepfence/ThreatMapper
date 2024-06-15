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
  if (name === 'aws') {
    return <AwsIcon />;
  } else if (name === 'aws_org') {
    return <AwsIcon />;
  } else if (name === 'azure') {
    return <AzureIcon />;
  } else if (name === 'azure_org') {
    return <AzureIcon />;
  } else if (name === 'gcp_org') {
    return <GoogleIcon />;
  } else if (name === 'gcp') {
    return <GoogleIcon />;
  } else if (name === 'kubernetes') {
    return <KubernetesIcon />;
  } else if (name === 'linux') {
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
