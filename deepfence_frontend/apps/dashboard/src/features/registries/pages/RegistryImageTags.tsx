import { useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaHistory } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import { HiArrowSmLeft } from 'react-icons/hi';
import {
  generatePath,
  LoaderFunctionArgs,
  useLoaderData,
  useParams,
} from 'react-router-dom';
import { Button, ModalHeader, SlidingModal } from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelContainerImage } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { RegistryImageTagsTable } from '@/features/registries/components/RegistryImageTagsTable';
import { ApiError, makeRequest } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { usePageNavigation } from '@/utils/usePageNavigation';

export type LoaderDataType = {
  error?: string;
  message?: string;
  data?: ModelContainerImage[];
};

async function getImageTags(accountId: string, imageId: string): Promise<LoaderDataType> {
  const result = await makeRequest({
    apiFunction: getRegistriesApiClient().listImageTags,
    apiArgs: [
      {
        imageName: imageId,
        registryId: accountId,
      },
    ],
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
    return {
      error: 'No data found',
    };
  }
  return {
    data: result,
  };
}

const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderDataType> => {
  const { account, accountId, imageId } = params as {
    account: string;
    accountId: string;
    imageId: string;
  };

  if (!account || !accountId || !imageId) {
    return {
      error: 'Account Type, Account Id and Image Id are required',
    };
  }
  return await getImageTags(accountId, imageId);
};

const HeaderComponent = ({
  timestamp,
  elementToFocusOnClose,
  setShowFilter,
}: {
  timestamp: number;
  elementToFocusOnClose: React.MutableRefObject<null>;
  setShowFilter: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { account, accountId } = useParams() as {
    account: string;
    accountId: string;
  };

  return (
    <div className="flex p-2 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
      <DFLink
        to={generatePath('/registries/images/:account/:accountId', {
          account,
          accountId,
        })}
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
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        REGISTRY ACCOUNTS / {account.toUpperCase()} / {accountId}
      </span>
      <div className="ml-auto flex items-center gap-x-4">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 dark:text-gray-200">
            {formatMilliseconds(timestamp)}
          </span>
          <span className="text-gray-400 text-[10px]">Last refreshed</span>
        </div>
        <Button
          className="ml-auto bg-blue-100 dark:bg-blue-500/10"
          size="xs"
          color="normal"
          onClick={() => {
            setShowFilter(true);
          }}
        >
          <IconContext.Provider
            value={{
              className: 'w-4 h-4',
            }}
          >
            <FaHistory />
          </IconContext.Provider>
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

const RegistryImageTags = () => {
  const { navigate } = usePageNavigation();
  const { account, accountId } = useParams() as {
    account: string;
    accountId: string;
  };
  const elementToFocusOnClose = useRef(null);
  const [showFilter, setShowFilter] = useState(false);

  const [open, setOpen] = useState(true);
  const ref = useRef(null);

  const loaderData = useLoaderData() as LoaderDataType;
  const { data, error } = loaderData;

  if (data === undefined) {
    return <div>Loading...</div>;
  }
  return (
    <>
      <HeaderComponent
        elementToFocusOnClose={elementToFocusOnClose}
        setShowFilter={setShowFilter}
        timestamp={0}
      />
      <div className="p-4">
        <RegistryImageTagsTable data={data} />
      </div>
    </>
  );
};

export const module = {
  loader,
  element: <RegistryImageTags />,
};
