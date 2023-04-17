import { Suspense } from 'react';
import { IconContext } from 'react-icons';
import { HiArrowSmLeft } from 'react-icons/hi';
import {
  ActionFunction,
  Link,
  LoaderFunctionArgs,
  redirect,
  useFetcher,
  useLoaderData,
  useParams,
} from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Card, CircleSpinner, TextInput } from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelSettingsResponse,
  ModelSettingUpdateRequestKeyEnum,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

export type UpdateActionReturnType = {
  error?: string;
  fieldErrors?: {
    value?: string;
  };
};

export const action: ActionFunction = async ({
  request,
}): Promise<UpdateActionReturnType> => {
  const formData = await request.formData();
  // add console_url which is the origin of request
  formData.append('consoleUrl', window.location.origin);
  const body = Object.fromEntries(formData);

  const r = await makeRequest({
    apiFunction: getSettingsApiClient().updateSettings,
    apiArgs: [
      {
        id: Number(body.id),
        modelSettingUpdateRequest: {
          key: body.key as ModelSettingUpdateRequestKeyEnum,
          value: body.value as string,
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<UpdateActionReturnType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();

        return error.set({
          fieldErrors: {
            value: modelResponse.error_fields?.value as string,
          },
          error: modelResponse.message ?? '',
        });
      } else if (r.status === 403) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          error: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }
  toast.success('Global settings details updated successfully');
  throw redirect('/settings/global-settings', 302);
};

type LoaderDataType = {
  message?: string;
  data?: ModelSettingsResponse;
};
const getData = async (id: number): Promise<LoaderDataType> => {
  const settingsList = await makeRequest({
    apiFunction: getSettingsApiClient().getSettings,
    apiArgs: [],
  });

  if (ApiError.isApiError(settingsList)) {
    return {
      message: 'Error in getting Global Settings',
    };
  }

  return {
    data: settingsList.find((setting) => setting.id === id),
  };
};
const loader = async ({
  params,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getData(Number(params.id)),
  });
};

const EditGlobalSetting = () => {
  const loaderData = useLoaderData() as LoaderDataType;
  const fetcher = useFetcher<UpdateActionReturnType>();
  const { data } = fetcher;

  const { id } = useParams() as {
    id: string;
  };

  if (!id) {
    throw new Error('Settings ID is required');
  }
  return (
    <>
      <SettingsTab value="global-settings">
        <div className="flex">
          <DFLink
            to="/settings/global-settings"
            className="shrink-0 flex items-center justify-start hover:no-underline active:no-underline focus:no-underline mr-2 mt-2 ml-5"
          >
            <IconContext.Provider
              value={{
                className: 'text-blue-600 dark:text-blue-500 ',
              }}
            >
              <HiArrowSmLeft />
            </IconContext.Provider>
            <span className="text text-blue-600 dark:text-blue-500">Back</span>
          </DFLink>
          <h3 className="py-2 mt-2 font-medium text-gray-900 dark:text-white uppercase text-sm tracking-wider">
            Update Global Settings
          </h3>
        </div>
        <Card className="flex-col p-5 mt-2 ml-5 gap-y-4">
          <Suspense fallback={<CircleSpinner size="xs" />}>
            <DFAwait resolve={loaderData.data}>
              {(setting: LoaderDataType) => {
                return (
                  <div className="w-3/4 max-w-xs">
                    <fetcher.Form method="post" className="flex flex-col gap-y-3">
                      <TextInput
                        type="hidden"
                        className="hidden"
                        name="id"
                        value={setting.data?.id}
                      />
                      <TextInput
                        type="hidden"
                        className="hidden"
                        name="key"
                        value={setting.data?.key}
                      />
                      <TextInput
                        label={setting.data?.label}
                        type={'text'}
                        placeholder={setting.data?.key}
                        name="value"
                        color={data?.fieldErrors?.value ? 'error' : 'default'}
                        sizing="sm"
                        defaultValue={setting.data?.value}
                        helperText={data?.fieldErrors?.value}
                        required
                      />

                      <Button color="primary" className=" pl-3" type="submit">
                        Submit
                      </Button>
                      <Button color="danger" className="pl-3">
                        <Link to="/settings/global-settings">Cancel</Link>
                      </Button>
                    </fetcher.Form>
                    {data?.error && (
                      <p className="text-red-500 text-sm py-3">{data?.error}</p>
                    )}
                  </div>
                );
              }}
            </DFAwait>
          </Suspense>
        </Card>
      </SettingsTab>
    </>
  );
};

export const module = {
  element: <EditGlobalSetting />,
  loader,
  action,
};
