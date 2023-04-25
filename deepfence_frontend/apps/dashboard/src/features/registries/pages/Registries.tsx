import { Suspense } from 'react';
import {
  HiDocumentText,
  HiOutlineChevronRight,
  HiPhotograph,
  HiTag,
} from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { useLoaderData } from 'react-router-dom';
import { Card } from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ModelSummary } from '@/api/generated/models/ModelSummary';
import { LinkButton } from '@/components/LinkButton';
import { getRegistryLogo } from '@/constants/logos';
import { useTheme } from '@/theme/ThemeContext';
import { RegistryType } from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';
import { abbreviateNumber } from '@/utils/number';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

interface RegistryResponseType extends ModelSummary {
  type: string;
}

export type LoaderDataType = {
  error?: string;
  message?: string;
  data: RegistryResponseType[];
};

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
    response.push({
      registries: value.registries,
      images: value.images,
      tags: value.tags,
      type: key,
    });
  }

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
            <div className="h-2 w-24 bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-2 w-20 bg-gray-200 dark:bg-gray-700 rounded-md ml-auto mt-2"></div>
          </div>
          <div className="flex items-center gap-6">
            <div className="px-4 flex items-center border-r border-gray-200 dark:border-gray-700 w-20 h-20">
              <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-10 w-10"></div>
            </div>
            <div className="flex gap-x-4 justify-center items-center">
              <div className="grid grid-cols-3 gap-4">
                <div className="h-2 w-20 bg-gray-200 dark:bg-gray-700 rounded col-span-1"></div>
                <div className="h-2 w-20 bg-gray-200 dark:bg-gray-700 rounded col-span-1"></div>
                <div className="h-2 w-20 bg-gray-200 dark:bg-gray-700 rounded col-span-1"></div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
};

const Registry = ({ registry }: { registry: RegistryResponseType }) => {
  const { mode } = useTheme();
  const { icon, name } = getRegistryLogo(
    registry.type as unknown as keyof typeof RegistryType,
    mode,
  );

  return (
    <Card className="p-2 pb-3 flex flex-col" key={registry.type}>
      <div className="flex items-center w-full">
        <h4 className="text-gray-900 font-medium text-base dark:text-white mr-4">
          {name}
        </h4>
        <div className="flex ml-auto">
          <LinkButton to={`/registries/${registry.type}`} sizing="xs">
            <>
              Go to details&nbsp;
              <HiOutlineChevronRight />
            </>
          </LinkButton>
        </div>
      </div>
      <div className="flex items-center gap-x-6 mt-2">
        <div className="gap-y-2 border-r border-gray-200 dark:border-gray-700">
          <div className="px-4 flex justify-center items-center h-8 w-20 m-w-[32px] m-h-[32px]">
            <img height="100%" width="100%" src={icon} alt="logo" />
          </div>
        </div>

        <div className="flex gap-x-4 justify-center items-center">
          <div className="flex flex-col justify-center">
            <span className="text-[1.875rem] text-gray-900 dark:text-gray-200 font-light">
              {abbreviateNumber(registry.registries ?? 0)}
            </span>
            <div className="flex items-center gap-x-1 min-w-[90px]">
              <IconContext.Provider
                value={{
                  className: 'h-5 w-5 text-blue-500 dark:text-blue-400',
                }}
              >
                <HiDocumentText />
              </IconContext.Provider>
              <span className="text-xs text-gray-500 dark:text-gray-400">{`Registr${
                registry.registries && registry.registries > 1 ? 'ies' : 'y'
              }`}</span>
            </div>
          </div>
          <div className="gap-x-2 flex flex-col justify-center">
            <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
              {abbreviateNumber(registry.images ?? 0)}
            </span>
            <div className="flex items-center gap-x-1 min-w-[70px]">
              <IconContext.Provider
                value={{
                  className: 'h-5 w-5 text-blue-500 dark:text-blue-400',
                }}
              >
                <HiPhotograph />
              </IconContext.Provider>
              <span className="text-xs text-gray-500 dark:text-gray-400">{`Image${
                registry.images && registry.images > 1 ? 's' : ''
              }`}</span>
            </div>
          </div>
          <div className="gap-x-2 flex flex-col justify-center">
            <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
              {abbreviateNumber(registry.tags ?? 0)}
            </span>
            <div className="flex items-center gap-x-1 min-w-[90px]">
              <IconContext.Provider
                value={{
                  className: 'h-5 w-5 text-blue-500 dark:text-blue-400',
                }}
              >
                <HiTag />
              </IconContext.Provider>
              <span className="text-xs text-gray-500 dark:text-gray-400">{`Tag${
                registry.tags && registry.tags > 1 ? 's' : ''
              }`}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const Registries = () => {
  const loaderData = useLoaderData() as LoaderDataType;
  const { mode } = useTheme();

  return (
    <>
      <div className="flex p-2 pl-2 w-full shadow bg-white dark:bg-gray-800">
        <span className="text-md font-medium text-gray-700 dark:text-gray-200">
          Registries
        </span>
      </div>
      <div className="flex gap-2 flex-wrap my-2 pl-2">
        <Suspense fallback={<RegistrySkeleton />}>
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType['data']) => {
              return resolvedData.map((registry) => {
                return (
                  <Registry
                    key={
                      getRegistryLogo(
                        registry.type as unknown as keyof typeof RegistryType,
                        mode,
                      ).name
                    }
                    registry={registry}
                  />
                );
              });
            }}
          </DFAwait>
        </Suspense>
      </div>
    </>
  );
};

export const module = {
  loader,
  element: <Registries />,
};
