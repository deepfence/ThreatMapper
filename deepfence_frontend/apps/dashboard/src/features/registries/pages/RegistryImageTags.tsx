import { useRef, useState } from 'react';
import {
  generatePath,
  LoaderFunctionArgs,
  useLoaderData,
  useParams,
} from 'react-router-dom';
import { ModalHeader, SlidingModal } from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelContainerImage } from '@/api/generated';
import { RegistryImageTagsTable } from '@/features/registries/components/RegistryImageTagsTable';
import { ApiError, makeRequest } from '@/utils/api';
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
      <SlidingModal
        header={
          <ModalHeader>
            <div className="font-medium text-lg p-4">Image Tags for {'imageName'}</div>
          </ModalHeader>
        }
        open={open}
        onOpenChange={() => {
          navigate(
            generatePath('/registries/images/:account/:accountId', {
              account,
              accountId,
            }),
          );
          setOpen(false);
        }}
        width={'w-2/3'}
      >
        <div className="p-4">
          <RegistryImageTagsTable data={data} />
        </div>
      </SlidingModal>
    </>
  );
};

export const module = {
  loader,
  element: <RegistryImageTags />,
};
