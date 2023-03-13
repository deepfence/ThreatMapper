import { Suspense } from 'react';
import { FaCloud, FaImages, FaTags } from 'react-icons/fa';
import { HiArrowSmRight } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { useLoaderData } from 'react-router-dom';
import { Button, Card } from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ModelSummary } from '@/api/generated/models/ModelSummary';
import LogoAWS from '@/assets/logo-aws.svg';
import LogoAzure from '@/assets/logo-azure-registry.svg';
import LogoDocker from '@/assets/logo-docker.svg';
import LogoGitlab from '@/assets/logo-gitlab.svg';
import LogoGoogle from '@/assets/logo-google.svg';
import LogoHarbor from '@/assets/logo-harbor.svg';
import LogoJFrog from '@/assets/logo-jfrog.svg';
import LogoQuay from '@/assets/logo-jfrog.svg';
import { DFLink } from '@/components/DFLink';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

interface RegistryResponseType extends ModelSummary {
  name: string;
  type: string;
  icon: string;
}

export type LoaderDataType = {
  error?: string;
  message?: string;
  data: RegistryResponseType[];
};
export const RegistryType = {
  azure_container_registry: 'azure_container_registry',
  docker_hub: 'docker_hub',
  docker_private_registry: 'docker_private_registry',
  ecr: 'ecr',
  gitlab: 'gitlab',
  google_container_registry: 'google_container_registry',
  harbor: 'harbor',
  jfrog_container_registry: 'jfrog_container_registry',
  quay: 'quay',
} as const;

type Keys = keyof typeof RegistryType;
type ReponseType = { [K in Keys]: RegistryResponseType };

async function getRegistriesSummary(): Promise<RegistryResponseType[]> {
  const result = await makeRequest({
    apiFunction: getRegistriesApiClient().getRegistriesSummary,
    apiArgs: [],
    errorHandler: async (r) => {
      const error = new ApiError<{ message?: string }>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }
  if (result === null) {
    // TODO: handle this case with 404 status maybe
    throw new Error('Error getting registries');
  }
  const response: RegistryResponseType[] = [];
  for (const [key, value] of Object.entries(result as ReponseType)) {
    let icon = '';
    let name = '';
    if (key === RegistryType.azure_container_registry) {
      icon = LogoAzure;
      name = 'Azure Registry';
    } else if (key === RegistryType.docker_hub) {
      icon = LogoDocker;
      name = 'Docker Registry';
    } else if (key === RegistryType.docker_private_registry) {
      icon = LogoDocker;
      name = 'Docker Private Registry';
    } else if (key === RegistryType.ecr) {
      icon = LogoAWS;
      name = 'Amazon ECR';
    } else if (key === RegistryType.gitlab) {
      icon = LogoGitlab;
      name = 'Gitlab Registry';
    } else if (key === RegistryType.google_container_registry) {
      icon = LogoGoogle;
      name = 'Google Registry';
    } else if (key === RegistryType.harbor) {
      icon = LogoHarbor;
      name = 'Harbor Registry';
    } else if (key === RegistryType.jfrog_container_registry) {
      icon = LogoJFrog;
      name = 'JFrog Registry';
    } else if (key === RegistryType.quay) {
      icon = LogoQuay;
      name = 'Quay Registry';
    }
    response.push({
      registries: value.registries,
      images: value.images,
      tags: value.tags,
      type: key,
      name,
      icon,
    });
  }
  console.log(response);
  return response;
}

const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getRegistriesSummary(),
  });
};

const RegistrySkeleton = () => {
  return (
    <>
      {Array.from(Array(9).keys()).map((k) => (
        <Card className="p-4 animate-pulse items-center gap-2 min-w-[400px]" key={k}>
          <div className="flex items-center justify-between w-full">
            <div className="h-2 w-24 bg-slate-200"></div>
            <div className="h-2 w-20 bg-slate-200 ml-auto mt-2"></div>
          </div>
          <div className="flex items-center gap-6">
            <div className="px-4 flex items-center border-r border-gray-200 dark:border-gray-700 w-20 h-20">
              <div className="rounded-full bg-slate-200 h-10 w-10"></div>
            </div>
            <div className="flex gap-x-4 justify-center items-center">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 w-20 bg-slate-200 rounded col-span-1"></div>
                <div className="h-2 w-20 bg-slate-200 rounded col-span-1"></div>
                <div className="h-2 w-20 bg-slate-200 rounded col-span-1"></div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
};

const Registry = ({ registry }: { registry: RegistryResponseType }) => {
  return (
    <Card className="p-4 items-center gap-2" key={registry.type}>
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
        <div className="px-4 flex items-center border-r border-gray-200 dark:border-gray-700 w-20 h-20">
          <img height="100%" width="100%" src={registry.icon} alt="logo" />
        </div>
        <div className="flex gap-x-4 justify-center items-center">
          <div className="flex flex-col justify-center">
            <div className="pr-4 flex items-center gap-x-2">
              <IconContext.Provider
                value={{
                  className: 'h-4 w-4 text-blue-500 dark:text-blue-400',
                }}
              >
                <FaCloud />
              </IconContext.Provider>
              <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
                {registry.registries}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Total Registries
            </span>
          </div>
          <div className="gap-x-2 flex flex-col justify-center">
            <div className="pr-4 flex items-center gap-x-2">
              <IconContext.Provider
                value={{
                  className: 'h-4 w-4 text-teal-500 dark:text-teal-400',
                }}
              >
                <FaImages />
              </IconContext.Provider>
              <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
                {registry.images}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">Total Images</span>
          </div>
          <div className="gap-x-2 flex flex-col justify-center">
            <div className="pr-4 flex items-center gap-x-2">
              <IconContext.Provider
                value={{
                  className: 'h-4 w-4 text-indigo-600 dark:text-indigo-400',
                }}
              >
                <FaTags />
              </IconContext.Provider>
              <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
                {registry.tags}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">Total Tags</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const Registries = () => {
  const loaderData = useLoaderData() as LoaderDataType;

  return (
    <div className="flex gap-6 flex-wrap mt-6 ml-6">
      <Suspense fallback={<RegistrySkeleton />}>
        <DFAwait resolve={loaderData.data}>
          {(resolvedData: LoaderDataType['data']) => {
            return resolvedData.map((registry) => {
              return <Registry key={registry.name} registry={registry} />;
            });
          }}
        </DFAwait>
      </Suspense>
    </div>
  );
};

export const module = {
  loader,
  element: <Registries />,
};
