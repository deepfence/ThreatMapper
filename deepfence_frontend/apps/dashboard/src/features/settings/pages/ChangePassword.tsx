import { Link, useFetcher } from 'react-router-dom';
import { ActionFunction, redirect } from 'react-router-dom';
import { Button, Card, TextInput, Typography } from 'ui-components';

import { getUserApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { ApiError, makeRequest } from '@/utils/api';
import { DFLink } from '@/components/DFLink';
import { IconContext } from 'react-icons';
import { HiArrowSmLeft } from 'react-icons/hi';

export type changePasswordActionReturnType = {
  error?: string;
  fieldErrors?: {
    old_password?: string;
    new_password?: string;
    confirm_password?: string;
  };
};

export const changePasswordAction: ActionFunction = async ({
  request,
}): Promise<changePasswordActionReturnType> => {
  const formData = await request.formData();
  // add console_url which is the origin of request
  formData.append('consoleUrl', window.location.origin);
  const body = Object.fromEntries(formData);
  if (body.new_password !== body.confirm_password) {
    return {
      fieldErrors: {
        confirm_password: 'Password does not match',
      },
    };
  }
  const r = await makeRequest({
    apiFunction: getUserApiClient().updatePassword,
    apiArgs: [
      {
        modelUpdateUserPasswordRequest: {
          old_password: body.new_password as string,
          new_password: body.new_password as string,
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<changePasswordActionReturnType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          fieldErrors: {
            old_password: modelResponse.error_fields?.old_password as string,
            new_password: modelResponse.error_fields?.new_password as string,
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
  throw redirect('/settings/user-management', 302);
};

const ChangePassword = () => {
  const fetcher = useFetcher<changePasswordActionReturnType>();
  const { data } = fetcher;
  return (
    <>
      <SettingsTab value="user-management">
        <DFLink
          to="/settings/user-management"
          className="shrink-0 flex items-center justify-start hover:no-underline active:no-underline focus:no-underline ml-auto mr-2 mt-2"
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
        <span className="flex ml-10 mt-2 dark:text-white ">User Profile</span>
        <Card className="flex-col p-5 mt-2 ml-10 gap-y-4">
          <fetcher.Form method="post" className="flex flex-col gap-y-3">
            <TextInput
              label="Old Password"
              type={'password'}
              placeholder="Old Password"
              name="old_password"
              color={data?.fieldErrors?.old_password ? 'error' : 'default'}
              sizing="sm"
              className="w-3/4 min-[200px] max-w-xs"
            />
            {data?.fieldErrors?.old_password && (
              <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
                {data?.fieldErrors?.old_password}
              </p>
            )}
            <TextInput
              label="New Password"
              type={'password'}
              placeholder="New Password"
              name="new_password"
              sizing="sm"
              className="w-3/4 min-[200px] max-w-xs"
              color={data?.fieldErrors?.new_password ? 'error' : 'default'}
            />
            {data?.fieldErrors?.new_password && (
              <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
                {data?.fieldErrors?.new_password}
              </p>
            )}
            <TextInput
              label="Confirm Password"
              type={'password'}
              placeholder="Confirm Password"
              name="confirm_password"
              sizing="sm"
              className="w-3/4 min-[200px] max-w-xs"
              color={data?.fieldErrors?.confirm_password ? 'error' : 'default'}
            />
            {data?.fieldErrors?.confirm_password && (
              <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
                {data?.fieldErrors?.confirm_password}
              </p>
            )}
            <span className="flex flex-row gap-8 pt-2">
              <Link to="/settings/user-management">
                <Button color="danger" className="w-36" size="xs">
                  Cancel
                </Button>
              </Link>
              <Button color="primary" className="w-36" type="submit" size="xs">
                Change Password
              </Button>
            </span>
          </fetcher.Form>
        </Card>
      </SettingsTab>
    </>
  );
};

export const module = {
  element: <ChangePassword />,
  action: changePasswordAction,
};
