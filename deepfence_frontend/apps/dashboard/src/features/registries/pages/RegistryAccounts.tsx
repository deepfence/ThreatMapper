import { Suspense } from 'react';
import { IconContext } from 'react-icons';
import { FaAngleDoubleUp, FaImages, FaPlus, FaTags } from 'react-icons/fa';
import { HiChevronRight } from 'react-icons/hi';
import {
  generatePath,
  LoaderFunctionArgs,
  useLoaderData,
  useParams,
} from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbLink,
  Button,
  Card,
  CircleSpinner,
  TableSkeleton,
} from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelRegistryListResp } from '@/api/generated';
import { ModelSummary } from '@/api/generated/models/ModelSummary';
import LogoDocker from '@/assets/logo-docker.svg';
import { DFLink } from '@/components/DFLink';
import { RegistryIcon } from '@/components/sideNavigation/icons/Registry';
import { RegistryAccountsTable } from '@/features/registries/components/RegistryAccountsTable';
import { action } from '@/features/registries/components/RegistryAccountsTable';
import { Mode, useTheme } from '@/theme/ThemeContext';
import { registryTypeToNameMapping } from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { usePageNavigation } from '@/utils/usePageNavigation';

type LoaderDataTypeForAccounts = {
  error?: string;
  message?: string;
  accounts: Awaited<ReturnType<typeof getRegistryAccounts>>;
};

type LoaderDataTypeForSummary = {
  error?: string;
  message?: string;
  summary: Awaited<ReturnType<typeof getRegistrySummaryByType>>;
};

type LoaderDataType = LoaderDataTypeForAccounts & LoaderDataTypeForSummary;

async function getRegistrySummaryByType(accountType: string): Promise<{
  summary: ModelSummary;
  message?: string;
}> {
  const registrySummary = await makeRequest({
    apiFunction: getRegistriesApiClient().getRegistrySummaryByType,
    apiArgs: [
      {
        registryType: accountType,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<{
        message?: string;
      }>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(registrySummary)) {
    throw registrySummary.value();
  }

  return {
    summary: registrySummary,
  };
}

async function getRegistryAccounts(): Promise<{
  accounts: ModelRegistryListResp[];
  message?: string;
}> {
  const listAccounts = await makeRequest({
    apiFunction: getRegistriesApiClient().listRegistries,
    apiArgs: [],
    errorHandler: async (r) => {
      const error = new ApiError<{
        message?: string;
      }>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(listAccounts)) {
    throw listAccounts.value();
  }

  return {
    accounts: listAccounts,
  };
}

const loader = async ({
  params,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  const account = params?.account;

  if (!account) {
    throw new Error('Registry Account is required');
  }
  return typedDefer({
    summary: getRegistrySummaryByType(account),
    accounts: getRegistryAccounts(),
  });
};

const HeaderComponent = ({ nodeType }: { nodeType: string }) => {
  const { navigate } = usePageNavigation();
  return (
    <div className="flex p-1 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
      <Breadcrumb separator={<HiChevronRight />} transparent>
        <BreadcrumbLink>
          <DFLink to={'/registries'}>Registries</DFLink>
        </BreadcrumbLink>
        <BreadcrumbLink>
          <span className="inherit cursor-auto">
            {registryTypeToNameMapping[nodeType]}
          </span>
        </BreadcrumbLink>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-x-4">
        <Button
          outline
          color="primary"
          size="xs"
          startIcon={<FaPlus />}
          onClick={() => {
            navigate(
              generatePath('/registries/add/:account', {
                account: nodeType,
              }),
            );
          }}
        >
          Add Registry
        </Button>
      </div>
    </div>
  );
};

const NoRegistryFound = () => {
  return (
    <div className="flex flex-col items-center justify-center mt-40">
      <img src={LogoDocker} alt="empty registry" />
      <span className="text-2xl font-medium text-gray-700 dark:text-white">
        No Registry Accounts
      </span>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Add a registry account to get started
      </span>
    </div>
  );
};

const RegistrySummaryComponent = ({ theme }: { theme: Mode }) => {
  const loaderData = useLoaderData() as LoaderDataType['summary'];
  return (
    <div className="flex flex-col gap-y-2">
      <Card className="p-4 grid grid-flow-row-dense gap-y-8">
        <Suspense
          fallback={
            <div className="min-h-[300px] flex items-center justify-center">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <DFAwait resolve={loaderData.summary}>
            {(resolvedData: LoaderDataType['summary']) => {
              const { message, summary } = resolvedData;

              if (message) {
                return (
                  <div className="w-full text-md text-gray-900 dark:text-text-white">
                    No data
                  </div>
                );
              }
              const {
                images = 0,
                tags = 0,
                scans_in_progress = 0,
                registries = 0,
              } = summary;

              return (
                <>
                  <div className="grid grid-flow-col-dense gap-x-4">
                    <div className="bg-gray-100 dark:bg-gray-500/10 rounded-lg flex items-center justify-center">
                      <div className="w-14 h-14 text-blue-500 dark:text-blue-400">
                        <RegistryIcon />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 dark:text-gray-200 tracking-wider">
                        Registries
                      </h4>
                      <div className="mt-2">
                        <span className="text-2xl font-light text-gray-900 dark:text-gray-200">
                          {registries.toString()}
                        </span>
                        <h5 className="text-xs text-gray-500 dark:text-gray-200 mb-2">
                          Total count
                        </h5>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-x-4 justify-center items-center">
                    <div className="gap-x-2 flex flex-col justify-center">
                      <div className="pr-4 flex items-center gap-x-2">
                        <IconContext.Provider
                          value={{
                            className: 'h-4 w-4 text-teal-500 dark:text-teal-400',
                          }}
                        >
                          <FaImages />
                        </IconContext.Provider>
                        <span className="text-lg text-gray-900 dark:text-gray-200 font-light">
                          {images.toString()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        Total Images
                      </span>
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
                        <span className="text-lg text-gray-900 dark:text-gray-200 font-light">
                          {tags}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        Total Tags
                      </span>
                    </div>
                    <div className="gap-x-2 flex flex-col justify-center">
                      <div className="pr-4 flex items-center gap-x-2">
                        <IconContext.Provider
                          value={{
                            className: 'h-4 w-4 text-indigo-600 dark:text-indigo-400',
                          }}
                        >
                          <FaAngleDoubleUp />
                        </IconContext.Provider>
                        <span className="text-lg text-gray-900 dark:text-gray-200 font-light">
                          {scans_in_progress.toString()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        In Progress
                      </span>
                    </div>
                  </div>
                </>
              );
            }}
          </DFAwait>
        </Suspense>
      </Card>
    </div>
  );
};

const RegistryAccounts = () => {
  const { mode } = useTheme();
  const params = useParams() as {
    account: string;
  };
  const loaderData = useLoaderData() as LoaderDataType['accounts'];

  return (
    <>
      <HeaderComponent nodeType={params.account} />
      <div className="grid grid-cols-[400px_1fr] p-2 gap-x-2">
        <RegistrySummaryComponent theme={mode} />
        <Suspense fallback={<TableSkeleton columns={3} rows={15} size={'md'} />}>
          <DFAwait resolve={loaderData?.accounts}>
            {(resolvedData: LoaderDataType['accounts']) => {
              const registriesOfAccountType =
                resolvedData?.accounts.filter(
                  (registry) => registry.registry_type === params.account,
                ) ?? [];
              if (registriesOfAccountType.length === 0) {
                return <NoRegistryFound />;
              }
              return <RegistryAccountsTable data={registriesOfAccountType} />;
            }}
          </DFAwait>
        </Suspense>
      </div>
    </>
  );
};

export const module = {
  action,
  loader,
  element: <RegistryAccounts />,
};
