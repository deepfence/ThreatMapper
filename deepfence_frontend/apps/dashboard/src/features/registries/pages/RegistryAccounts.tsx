import { Suspense, useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaPlus } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import { HiArrowSmLeft } from 'react-icons/hi';
import {
  generatePath,
  LoaderFunctionArgs,
  useLoaderData,
  useParams,
} from 'react-router-dom';
import { Button, Card, SlidingModal, TableSkeleton } from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelRegistryListResp } from '@/api/generated';
import LogoDocker from '@/assets/logo-docker.svg';
import { DFLink } from '@/components/DFLink';
import { RegistryAccountsTable } from '@/features/registries/components/RegistryAccountsTable';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { usePageNavigation } from '@/utils/usePageNavigation';

export type LoaderDataType = {
  error?: string;
  message?: string;
  data?: Awaited<ReturnType<typeof getRegistryAccounts>>;
};

async function getRegistryAccounts(): Promise<{
  registries: ModelRegistryListResp[];
  currentPage: number;
  totalRows: number;
  message?: string;
}> {
  const result = await makeRequest({
    apiFunction: getRegistriesApiClient().listRegistries,
    apiArgs: [],
    errorHandler: async (r) => {
      const error = new ApiError<LoaderDataType>({});
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

  if (!result) {
    return {
      registries: [],
      currentPage: 0,
      totalRows: 0,
    };
  }

  return {
    registries: result,
    currentPage: 0,
    totalRows: 0,
  };
}

const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getRegistryAccounts(),
  });
};

const HeaderComponent = ({
  nodeType,
  elementToFocusOnClose,
  setShowFilter,
}: {
  nodeType: string;
  elementToFocusOnClose: React.MutableRefObject<null>;
  setShowFilter: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { navigate } = usePageNavigation();
  return (
    <div className="flex p-2 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
      <DFLink
        to="/registries"
        className="flex hover:no-underline items-center justify-center mr-2"
      >
        <IconContext.Provider
          value={{
            className: 'w-5 h-5 text-blue-600 dark:text-blue-500 ',
          }}
        >
          <HiArrowSmLeft />
        </IconContext.Provider>
      </DFLink>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 uppercase">
        REGISTRY ACCOUNTS / {nodeType}
      </span>
      <div className="ml-auto flex items-center gap-x-4">
        <Button
          outline
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
        <div className="relative">
          <span className="absolute left-0 top-0 inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
          <Button
            className="ml-auto bg-blue-100 dark:bg-blue-500/10"
            size="xs"
            color="normal"
            ref={elementToFocusOnClose}
            onClick={() => {
              setShowFilter(true);
            }}
          >
            <IconContext.Provider
              value={{
                className: 'w-4 h-4',
              }}
            >
              <FiFilter />
            </IconContext.Provider>
          </Button>
        </div>
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

const RegistryAccounts = () => {
  const params = useParams() as {
    account: string;
  };
  const loaderData = useLoaderData() as LoaderDataType;
  const { data } = loaderData;

  const elementToFocusOnClose = useRef(null);
  const [showFilter, setShowFilter] = useState(false);

  const ref = useRef(null);

  return (
    <>
      <HeaderComponent
        nodeType={params.account}
        elementToFocusOnClose={elementToFocusOnClose}
        setShowFilter={setShowFilter}
      />
      <div className="p-4">
        <Suspense fallback={<TableSkeleton columns={3} rows={15} size={'md'} />}>
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType['data']) => {
              const registriesOfAccountType =
                resolvedData?.registries.filter(
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
  loader,
  element: <RegistryAccounts />,
};
