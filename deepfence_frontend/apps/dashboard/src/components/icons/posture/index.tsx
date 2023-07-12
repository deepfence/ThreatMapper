import { ShieldCheckSolidIcon } from '@/components/icons/posture/ShieldCheckSolid';
import { ShieldWarningSolidIcon } from '@/components/icons/posture/ShieldWarningSolid';
import { ShieldXSolidIcon } from '@/components/icons/posture/ShieldXSolid';

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
  if (!percent && percent !== 0) return <ShieldWarningSolidIcon />;

  if (percent >= 80 && percent <= 100) {
    return <ShieldCheckSolidIcon />;
  } else if (percent >= 30 && percent < 80) {
    return <ShieldWarningSolidIcon />;
  } else if (percent < 30) {
    return <ShieldXSolidIcon />;
  }
  return <div></div>;
};
