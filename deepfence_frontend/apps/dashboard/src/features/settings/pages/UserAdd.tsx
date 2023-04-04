import { Suspense, useState } from 'react';
import {
  Link,
  LoaderFunctionArgs,
  useFetcher,
  useLoaderData,
  useParams,
} from 'react-router-dom';
import {
  Button,
  Card,
  CircleSpinner,
  Select,
  SelectItem,
  TextInput,
  Typography,
} from 'ui-components';

import { getUserApiClient } from '@/api/api';
import { ModelUpdateUserIdRequestRoleEnum } from '@/api/generated';
import { ModelUser } from '@/api/generated/models/ModelUser';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import {
  UpdateActionReturnType,
  userAddAction,
} from '@/features/settings/pages/actions/userAddAction';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { usePageNavigation } from '@/utils/usePageNavigation';

type LoaderDataType = {
  message?: string;
  data?: ModelUser;
};
const getUser = async (userId: number): Promise<LoaderDataType> => {
  console.log('userId', userId);

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
const UserAdd = () => {
  const loaderData = useLoaderData() as LoaderDataType;
  const fetcher = useFetcher<UpdateActionReturnType>();
  const { data } = fetcher;
  const { navigate } = usePageNavigation();
  const { userId } = useParams() as {
    userId: string;
  };

  if (!userId) {
    throw new Error('User ID is required');
  }
  console.log('loaderData.data?.first_name', loaderData.data);

  return (
    <>
      <SettingsTab value="user-management">
        <span className="flex ml-5 mt-5">User Profile</span>
        <Card className="flex-col p-5 mt-2 ml-10 gap-y-4">
          <Suspense fallback={<CircleSpinner size="xs" />}>
            <DFAwait resolve={loaderData.data}>
              {(user: LoaderDataType) => {
                console.log('user', user.data);

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
                      className="w-3/4 min-[200px] max-w-xs"
                      defaultValue={user.data?.first_name}
                    />
                    {data?.fieldErrors?.firstName && (
                      <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
                        {data?.fieldErrors?.firstName}
                      </p>
                    )}
                    <TextInput
                      label="Last Name"
                      type={'text'}
                      placeholder="Last Name"
                      name="lastName"
                      sizing="sm"
                      className="w-3/4 min-[200px] max-w-xs"
                      color={data?.fieldErrors?.lastName ? 'error' : 'default'}
                      defaultValue={user.data?.last_name}
                    />
                    {data?.fieldErrors?.lastName && (
                      <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
                        {data?.fieldErrors?.lastName}
                      </p>
                    )}
                    <Select
                      defaultValue={user.data?.role}
                      name="role"
                      label={'Role'}
                      placeholder="admin"
                      sizing="xs"
                      className="w-3/4 min-[200px] max-w-xs relative pl-3"
                    >
                      <SelectItem
                        value={ModelUpdateUserIdRequestRoleEnum['StandardUser']}
                      >
                        User
                      </SelectItem>
                      <SelectItem value={ModelUpdateUserIdRequestRoleEnum['Admin']}>
                        admin
                      </SelectItem>
                      <SelectItem
                        value={ModelUpdateUserIdRequestRoleEnum['ReadOnlyUser']}
                      >
                        read only user
                      </SelectItem>
                    </Select>
                    <Select
                      name="status"
                      label={'Status'}
                      placeholder="Active"
                      sizing="xs"
                      className="w-3/4 min-[200px] max-w-xs relative pl-3"
                      defaultValue={user.data?.is_active ? 'Active' : 'inActive'}
                    >
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">InActive</SelectItem>
                    </Select>
                    <span className="flex flex-row gap-8 ">
                      <Link to="/settings/user-management">
                        <Button color="danger" className="w-36">
                          Cancel
                        </Button>
                      </Link>
                      <Button color="primary" className="w-36" type="submit">
                        Submit
                      </Button>
                    </span>
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
  element: <UserAdd />,
  loader,
  action: userAddAction,
};
