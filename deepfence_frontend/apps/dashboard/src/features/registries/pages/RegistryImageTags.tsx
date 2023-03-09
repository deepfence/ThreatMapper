import { useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaHistory, FaPlus } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import { LoaderFunctionArgs, useLoaderData, useParams } from 'react-router-dom';
import { Button, Card, SlidingModal } from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelContainerImage } from '@/api/generated';
import { GoBack } from '@/components/GoBack';
import { Metaheader } from '@/features/registries/components/common/Metaheader';
import { AddRegistry } from '@/features/registries/components/registry-accounts/AddRegistrySliding';
import { ImageTagTable } from '@/features/registries/components/registry-images/ImageTagTable';
import { ApiError, makeRequest } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';

export type LoaderDataType = {
  error?: string;
  message?: string;
  data?: ModelContainerImage[];
};

const metaheader = [
  {
    key: 'Total Tags',
    value: 56,
  },
  {
    key: 'In Progress',
    value: 0,
  },
];

async function getImageTags(
  registryId: string,
  imageName: string,
): Promise<LoaderDataType> {
  const result = await makeRequest({
    apiFunction: getRegistriesApiClient().listImageTags,
    apiArgs: [
      {
        imageName,
        registryId,
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
  const { id, image } = params;
  console.log('parararaa', params);
  if (!id || !image) {
    return {
      error: 'No registry ID or no image name provided',
    };
  }
  return await getImageTags(id, image);
};

const HeaderComponent = ({
  nodeType,
  imageName,
  regId,
  timestamp,
  elementToFocusOnClose,
  setShowFilter,
}: {
  nodeType: string;
  imageName: string;
  regId: number;
  timestamp: number;
  elementToFocusOnClose: React.MutableRefObject<null>;
  setShowFilter: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <div className="flex p-2 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
      <GoBack />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {nodeType.toUpperCase()} / REGISTRY ACCOUNTS / {regId} / {imageName.toUpperCase()}
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
  const params = useParams() as {
    type: string;
    id: string;
    image: string;
  };
  const elementToFocusOnClose = useRef(null);
  const [showFilter, setShowFilter] = useState(false);

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const loaderData = useLoaderData() as LoaderDataType;
  const { data, error } = loaderData;

  const currentTime = new Date().getTime();

  console.log('data', data, error);
  if (data === undefined) {
    return <div>Loading...</div>;
  }
  return (
    <>
      <HeaderComponent
        nodeType={params.type}
        imageName={params.image}
        regId={parseInt(params.id)}
        elementToFocusOnClose={elementToFocusOnClose}
        setShowFilter={setShowFilter}
        timestamp={currentTime}
      />
      <div className="grid p-2 gap-x-2">
        <div className="self-start grid gap-y-2">
          <Card className="w-auto h-12 flex p-4 pt-8 pb-8">
            <Metaheader metaheader={metaheader} />
            <div className="ml-auto flex items-center gap-x-4">
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
                <AddRegistry type={params.type} />
              </SlidingModal>
            </div>
          </Card>
          <ImageTagTable data={data} />
        </div>
      </div>
    </>
  );
};

export const module = {
  loader,
  element: <RegistryImageTags />,
};
