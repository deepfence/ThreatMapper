import { Suspense, useCallback, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import {
  ActionFunctionArgs,
  redirect,
  useFetcher,
  useLoaderData,
} from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Card, CircleSpinner, Modal } from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelEmailConfigurationResp } from '@/api/generated';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
export type ActionReturnType = {
  message?: string;
  success: boolean;
};

export const action = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const id = formData.get('id');
  const r = await makeRequest({
    apiFunction: getSettingsApiClient().deleteEmailConfiguration,
    apiArgs: [
      {
        configId: id as string,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ActionReturnType>({ success: false });
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
          success: false,
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }

  toast('Email configuration deleted sucessfully');
  throw redirect('/settings/email-configuration/add-email-configuration', 302);
  // return {
  //   success: true,
  // };
};
type LoaderDataType = {
  message?: string;
  data?: ModelEmailConfigurationResp[];
};
const getData = async (): Promise<LoaderDataType> => {
  const emailConfigPromise = await makeRequest({
    apiFunction: getSettingsApiClient().getEmailConfiguration,
    apiArgs: [],
  });

  if (ApiError.isApiError(emailConfigPromise)) {
    return {
      message: 'Error in getting email configuration',
    };
  }
  if (emailConfigPromise.length === 0) {
    throw redirect('/settings/email-configuration/add-email-configuration', 302);
  }
  return {
    data: emailConfigPromise,
  };
};
const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getData(),
  });
};

const EmailConfiguration = () => {
  const loaderData = useLoaderData() as LoaderDataType;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <SettingsTab value="email-configuration">
      <div className="flex">
        <span className="flex ml-2 mt-2 dark:text-white ">Email Configuration</span>
      </div>
      <div className="h-full w-2/5 mt-2 p-2">
        <Card className="p-4 grid grid-flow-row-dense gap-y-8">
          <Suspense fallback={<CircleSpinner size="xs" />}>
            <DFAwait resolve={loaderData.data}>
              {(resolvedData: LoaderDataType) => {
                const { data: configData = [], message } = resolvedData;
                const configuration: ModelEmailConfigurationResp = configData[0];
                return (
                  <>
                    <div className="mt-2 flex flex-col gap-y-4">
                      <div className="flex flex-col   px-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">Email Provider</span>
                          <span className="text-sm">{configuration.email_provider}</span>
                        </div>
                      </div>
                      <div className="flex flex-col   px-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">Email</span>
                          <span className="text-sm">{configuration.email_id}</span>
                        </div>
                      </div>
                      <div>
                        <Button
                          color="danger"
                          size="sm"
                          onClick={() => {
                            setShowDeleteDialog(true);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                      {message && <p className="text-red-500 text-md px-2">{message}</p>}
                    </div>
                    {showDeleteDialog && (
                      <DeleteConfirmationModal
                        showDialog={showDeleteDialog}
                        id={String(configuration.id)}
                        setShowDialog={setShowDeleteDialog}
                      />
                    )}
                  </>
                );
              }}
            </DFAwait>
          </Suspense>
        </Card>
      </div>
    </SettingsTab>
  );
};

export const module = {
  element: <EmailConfiguration />,
  loader,
  action,
};

const DeleteConfirmationModal = ({
  showDialog,
  id,
  setShowDialog,
}: {
  showDialog: boolean;
  id: string;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher();

  return (
    <Modal open={showDialog} onOpenChange={() => setShowDialog(false)}>
      <div className="grid place-items-center p-6">
        <IconContext.Provider
          value={{
            className: 'mb-3 dark:text-red-600 text-red-400 w-[70px] h-[70px]',
          }}
        >
          <HiOutlineExclamationCircle />
        </IconContext.Provider>
        <h3 className="mb-4 font-normal text-center text-sm">
          Email configuration will be deleted.
          <br />
          <span>Are you sure you want to delete?</span>
        </h3>
        <div className="flex items-center justify-right gap-4">
          <Button size="xs" type="button" onClick={() => setShowDialog(false)} outline>
            No, cancel
          </Button>
          <fetcher.Form method="post">
            <input type="hidden" name="id" value={id} />
            <Button size="xs" color="danger" type="submit">
              Yes, I&apos;m sure
            </Button>
          </fetcher.Form>
        </div>
      </div>
    </Modal>
  );
};
