import LogoAzure from '@/assets/logo-azure.svg';
import LogoDocker from '@/assets/logo-docker.svg';
import { Registry } from '@/features/registries/components/landing/Registry';

const RegistryData = [
  {
    type: 'docker_hub',
    name: 'Docker Hub',
    icon: <img height="100%" width="100%" src={LogoDocker} alt="logo" />,
    data: {
      totalAccount: Math.floor(Math.random() * 100),
      totalImages: Math.floor(Math.random() * 1000),
      totalTags: Math.floor(Math.random() * 50),
    },
  },
  {
    type: 'ecr',
    name: 'ECR',
    icon: <img height="100%" width="100%" src={LogoAzure} alt="logo" />,
    data: {
      totalAccount: Math.floor(Math.random() * 100),
      totalImages: Math.floor(Math.random() * 1000),
      totalTags: Math.floor(Math.random() * 50),
    },
  },
  {
    type: 'azure',
    name: 'Azure',
    icon: <img height="100%" width="100%" src={LogoAzure} alt="logo" />,
    data: {
      totalAccount: Math.floor(Math.random() * 100),
      totalImages: Math.floor(Math.random() * 1000),
      totalTags: Math.floor(Math.random() * 50),
    },
  },
  {
    type: 'gcr',
    name: 'GCR',
    icon: <img height="100%" width="100%" src={LogoAzure} alt="logo" />,
    data: {
      totalAccount: Math.floor(Math.random() * 100),
      totalImages: Math.floor(Math.random() * 1000),
      totalTags: Math.floor(Math.random() * 50),
    },
  },
  {
    type: 'dockerhub_private',
    name: 'Docker Hub (self hosted)',
    icon: <img height="100%" width="100%" src={LogoAzure} alt="logo" />,
    data: {
      totalAccount: Math.floor(Math.random() * 100),
      totalImages: Math.floor(Math.random() * 1000),
      totalTags: Math.floor(Math.random() * 50),
    },
  },
  {
    type: 'quay',
    name: 'Quay',
    icon: <img height="100%" width="100%" src={LogoAzure} alt="logo" />,
    data: {
      totalAccount: Math.floor(Math.random() * 100),
      totalImages: Math.floor(Math.random() * 1000),
      totalTags: Math.floor(Math.random() * 50),
    },
  },
  {
    type: 'harbor',
    name: 'Harbor',
    icon: <img height="100%" width="100%" src={LogoAzure} alt="logo" />,
    data: {
      totalAccount: Math.floor(Math.random() * 100),
      totalImages: Math.floor(Math.random() * 1000),
      totalTags: Math.floor(Math.random() * 50),
    },
  },
  {
    type: 'gitlab',
    name: 'GitLab',
    icon: <img height="100%" width="100%" src={LogoAzure} alt="logo" />,
    data: {
      totalAccount: Math.floor(Math.random() * 100),
      totalImages: Math.floor(Math.random() * 1000),
      totalTags: Math.floor(Math.random() * 50),
    },
  },
  {
    type: 'jfrog',
    name: 'JFrog',
    icon: <img height="100%" width="100%" src={LogoAzure} alt="logo" />,
    data: {
      totalAccount: Math.floor(Math.random() * 100),
      totalImages: Math.floor(Math.random() * 1000),
      totalTags: Math.floor(Math.random() * 50),
    },
  },
];

export const Registries = () => {
  return (
    <div className="flex gap-6 flex-wrap mt-6 ml-6">
      {RegistryData.map((registry) => {
        return <Registry key={registry.name} registry={registry} />;
      })}
    </div>
  );
};
