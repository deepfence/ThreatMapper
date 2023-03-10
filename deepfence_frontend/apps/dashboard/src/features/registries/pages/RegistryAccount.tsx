import { useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaHistory, FaPlus } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import { HiArrowSmLeft } from 'react-icons/hi';
import {
  generatePath,
  LoaderFunctionArgs,
  useLoaderData,
  useParams,
} from 'react-router-dom';
import { Button, Card, SlidingModal } from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelRegistryListResp } from '@/api/generated';
import LogoDocker from '@/assets/logo-docker.svg';
import { DFLink } from '@/components/DFLink';
import { GoBack } from '@/components/GoBack';
import { Metaheader } from '@/features/registries/components/common/Metaheader';
import { AddRegistry } from '@/features/registries/components/registry-accounts/AddRegistrySliding';
import { RegistryAccountTable } from '@/features/registries/components/registry-accounts/RegistryAccountTable';
import { ApiError, makeRequest } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { usePageNavigation } from '@/utils/usePageNavigation';

export type LoaderDataType = {
  error?: string;
  message?: string;
  data?: ModelRegistryListResp[];
};

const metaheader = [
  {
    key: 'Registries',
    value: 2,
  },
  {
    key: 'Total Images',
    value: 25,
  },
  {
    key: 'Total Tags',
    value: 56,
  },
  {
    key: 'In Progress',
    value: 0,
  },
];

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
        className="flex hover:no-underline items-center justify-center  mr-2"
      >
        <IconContext.Provider
          value={{
            className: 'w-5 h-5 text-blue-600 dark:text-blue-500 ',
          }}
        >
          <HiArrowSmLeft />
        </IconContext.Provider>
      </DFLink>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        REGISTRY ACCOUNTS / {nodeType.toUpperCase()}
      </span>
      <div className="ml-auto flex items-center gap-x-4">
        <Button
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

async function getRegistryAccounts() {
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

  if (result === null) {
    return {
      data: [],
    };
  }
  if (result !== undefined) {
    // Assign the array to the variable or parameter
    return {
      data: result,
    };
  }

  return {
    data: [],
  };
}

async function getRegistryMetadata() {
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

  if (result === null) {
    return {
      data: [],
    };
  }
  if (result !== undefined) {
    // Assign the array to the variable or parameter
    return {
      data: result,
    };
  }

  return {
    data: [],
  };
}

const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderDataType> => {
  return await getRegistryAccounts();
};

const RegistryAccount = () => {
  const params = useParams() as {
    account: string;
  };
  const loaderData = useLoaderData() as LoaderDataType;
  const { data } = loaderData;

  const elementToFocusOnClose = useRef(null);
  const [showFilter, setShowFilter] = useState(false);

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  if (data === undefined || data.length === 0) {
    return <div>Loading...</div>;
  }

  // filter data based on the type
  const filteredData = data.filter((item) => item.registry_type === params.account);

  return (
    <>
      <HeaderComponent
        nodeType={params.account}
        elementToFocusOnClose={elementToFocusOnClose}
        setShowFilter={setShowFilter}
      />
      {filteredData.length > 0 && (
        <div className="grid p-2 gap-x-2">
          <div className="self-start grid gap-y-2">
            <Card className="w-auto h-12 flex p-4 pt-8 pb-8">
              <Metaheader metaheader={metaheader} />
            </Card>
            <RegistryAccountTable data={filteredData} />
          </div>
        </div>
      )}

      {filteredData.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="flex flex-col items-center justify-center mt-40">
            <div className="flex items-center justify-center">
              <img src={LogoDocker} alt="empty registry" />
            </div>
            <div className="flex flex-col items-center justify-center">
              <span className="text-2xl font-medium text-gray-700 dark:text-gray-200">
                No Registry Accounts
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-200">
                Add a registry account to get started
              </span>
              <div className="flex items-center gap-x-4 mt-6">
                <Button
                  color="primary"
                  size="xs"
                  startIcon={<FaPlus />}
                  onClick={() => setOpen(true)}
                  ref={ref}
                >
                  Add Registry
                </Button>
                <SlidingModal
                  width="w-3/12"
                  header="Add Registry"
                  open={open}
                  onOpenChange={() => setOpen(false)}
                  elementToFocusOnCloseRef={ref}
                >
                  <AddRegistry account={params.account} />
                </SlidingModal>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const module = {
  loader,
  element: <RegistryAccount />,
};
