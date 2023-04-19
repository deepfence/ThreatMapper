import { Suspense } from 'react';
import { IconContext } from 'react-icons';
import { HiArrowSmLeft } from 'react-icons/hi';
import {
  Link,
  LoaderFunctionArgs,
  useFetcher,
  useLoaderData,
  useParams,
} from 'react-router-dom';
import { ActionFunction, redirect } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  Card,
  CircleSpinner,
  Select,
  SelectItem,
  TextInput,
} from 'ui-components';

import { getUserApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelUpdateUserIdRequestRoleEnum,
} from '@/api/generated';
import { ModelUser } from '@/api/generated/models/ModelUser';
import { DFLink } from '@/components/DFLink';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

export type UpdateActionReturnType = {
  error?: string;
  fieldErrors?: {
    firstName?: string;
    lastName?: string;
    role?: string;
    status?: string;
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
    apiFunction: getUserApiClient().updateUser,
    apiArgs: [
      {
        id: Number(body.id),
        modelUpdateUserIdRequest: {
          first_name: body.firstName as string,
          last_name: body.lastName as string,
          role: body.role as ModelUpdateUserIdRequestRoleEnum,
          is_active: body.status === 'true',
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<UpdateActionReturnType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          fieldErrors: {
            firstName: modelResponse.error_fields?.first_name as string,
            lastName: modelResponse.error_fields?.last_name as string,
            status: modelResponse.error_fields?.is_active as string,
            role: modelResponse.error_fields?.role as string,
          },
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
  toast.success('User details updated successfully');
  throw redirect('/settings/user-management', 302);
};

type LoaderDataType = {
  message?: string;
  data?: ModelUser;
};
const getUser = async (userId: number): Promise<LoaderDataType> => {
  const usersPromise = await makeRequest({
    apiFunction: getUserApiClient().getUser,
    apiArgs: [{ id: userId }],
  });

  if (ApiError.isApiError(usersPromise)) {
    return {
      message: 'Error in getting users list',
    };
  }

  return {
    data: usersPromise,
  };
};
const loader = async ({
  params,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getUser(Number(params.userId)),
  });
};
const EditUser = () => {
  const loaderData = useLoaderData() as LoaderDataType;
  const fetcher = useFetcher<UpdateActionReturnType>();
  const { data } = fetcher;
  const { userId } = useParams() as {
    userId: string;
  };

  if (!userId) {
    throw new Error('User ID is required');
  }
  return (
    <>
      <SettingsTab value="user-management">
        <div className="flex">
          <DFLink
            to="/settings/user-management"
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
          <span className="flex ml-2 mt-2 dark:text-white ">User Profile</span>
        </div>
        <Card className="max-w-sm flex-col p-5 mt-2 ml-5 gap-y-4">
          <Suspense fallback={<CircleSpinner size="xs" />}>
            <DFAwait resolve={loaderData.data}>
              {(user: LoaderDataType) => {
                return (
                  <fetcher.Form method="post" className="flex flex-col gap-y-3">
                    <TextInput type="hidden" name="id" value={user.data?.id} />
                    <TextInput
                      label="First Name"
                      type={'text'}
                      placeholder="First Name"
                      name="firstName"
                      color={data?.fieldErrors?.firstName ? 'error' : 'default'}
                      sizing="sm"
                      defaultValue={user.data?.first_name}
                      helperText={data?.fieldErrors?.firstName}
                      required
                    />
                    <TextInput
                      label="Last Name"
                      type={'text'}
                      placeholder="Last Name"
                      name="lastName"
                      sizing="sm"
                      color={data?.fieldErrors?.lastName ? 'error' : 'default'}
                      defaultValue={user.data?.last_name}
                      helperText={data?.fieldErrors?.lastName}
                      required
                    />
                    <Select
                      defaultValue={user.data?.role}
                      name="role"
                      label={'Role'}
                      placeholder="admin"
                      sizing="xs"
                      helperText={data?.fieldErrors?.role}
                    >
                      <SelectItem
                        value={ModelUpdateUserIdRequestRoleEnum['StandardUser']}
                      >
                        User
                      </SelectItem>
                      <SelectItem value={ModelUpdateUserIdRequestRoleEnum['Admin']}>
                        Admin
                      </SelectItem>
                      <SelectItem
                        value={ModelUpdateUserIdRequestRoleEnum['ReadOnlyUser']}
                      >
                        Read only user
                      </SelectItem>
                    </Select>
                    <Select
                      name="status"
                      label={'Status'}
                      placeholder="Active"
                      sizing="xs"
                      defaultValue={user.data?.is_active ? 'Active' : 'inActive'}
                      helperText={data?.fieldErrors?.status}
                    >
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">InActive</SelectItem>
                    </Select>
                    <Button color="primary" type="submit">
                      Submit
                    </Button>
                    <Link to="/settings/user-management">
                      <Button color="danger" className="w-full">
                        Cancel
                      </Button>
                    </Link>
                  </fetcher.Form>
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
  element: <EditUser />,
  loader,
  action,
};
