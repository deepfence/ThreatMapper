import { FaCloud, FaImages, FaTags } from 'react-icons/fa';
import { HiArrowSmRight } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { Button, Card } from 'ui-components';

import LogoAzure from '@/assets/logo-azure.svg';
import LogoDocker from '@/assets/logo-docker.svg';
import { DFLink } from '@/components/DFLink';

interface RegistryProps {
  type: string;
  name: string;
  icon: React.ReactNode;
  data: {
    totalAccount: number;
    totalImages: number;
    totalTags: number;
  };
}

export const Registry = ({ registry }: { registry: RegistryProps }) => {
  return (
    <Card className="p-4 items-center gap-2 grow-0 w-5/12" key={registry.type}>
      <div className="flex items-center justify-between w-full">
        <h4 className="text-gray-900 text-md dark:text-white">{registry.name}</h4>
        <div className="flex ml-auto mt-2">
          <DFLink to={`/registries/${registry.type}`}>
            <Button
              size="xs"
              color="normal"
              className="ml-auto text-blue-600 dark:text-blue-500"
            >
              Go to details
              <IconContext.Provider
                value={{
                  className: '',
                }}
              >
                <HiArrowSmRight />
              </IconContext.Provider>
            </Button>
          </DFLink>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="px-4 flex items-center border-r border-gray-200 dark:border-gray-700 w-24 h-24">
          {registry.icon}
        </div>
        <div className="flex gap-x-4 justify-center items-center">
          <div className="flex flex-col justify-center">
            <div className="pr-4 flex items-center gap-x-2">
              <IconContext.Provider
                value={{
                  className: 'h-6 w-6 text-blue-500 dark:text-blue-400',
                }}
              >
                <FaCloud />
              </IconContext.Provider>
              <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
                {registry.data.totalAccount}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Total Accounts
            </span>
          </div>
          <div className="gap-x-2 flex flex-col justify-center">
            <div className="pr-4 flex items-center gap-x-2">
              <IconContext.Provider
                value={{
                  className: 'h-6 w-6 text-teal-500 dark:text-teal-400',
                }}
              >
                <FaImages />
              </IconContext.Provider>
              <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
                {registry.data.totalImages}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">Total Images</span>
          </div>
          <div className="gap-x-2 flex flex-col justify-center">
            <div className="pr-4 flex items-center gap-x-2">
              <IconContext.Provider
                value={{
                  className: 'h-6 w-6 text-indigo-600 dark:text-indigo-400',
                }}
              >
                <FaTags />
              </IconContext.Provider>
              <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
                {registry.data.totalTags}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">Total Tags</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

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

const Registries = () => {
  return (
    <div className="flex gap-6 flex-wrap mt-6 ml-6">
      {RegistryData.map((registry) => {
        return <Registry key={registry.name} registry={registry} />;
      })}
    </div>
  );
};

export const module = {
  element: <Registries />,
};
