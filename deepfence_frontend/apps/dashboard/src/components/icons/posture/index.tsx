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
    return (
      <span className="w-10 h-10 block">
        <AwsIcon />
      </span>
    );
  } else if (name === 'aws_org') {
    return (
      <span className="w-10 h-10 block">
        <AwsIcon />
      </span>
    );
  } else if (name === 'azure') {
    return (
      <span className="w-10 h-10 block">
        <AzureIcon />
      </span>
    );
  } else if (name === 'gcp_org') {
    return (
      <span className="w-10 h-10 block">
        <GoogleIcon />
      </span>
    );
  } else if (name === 'gcp') {
    return (
      <span className="w-10 h-10 block">
        <GoogleIcon />
      </span>
    );
  } else if (name === 'kubernetes') {
    return (
      <span className="w-10 h-10 block">
        <KubernetesIcon />
      </span>
    );
  } else if (name === 'linux') {
    return (
      <span className="w-10 h-10 block">
        <LinuxIcon />
      </span>
    );
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
