import cx from 'classnames';
import {
  ActionFunctionArgs,
  Link,
  redirect,
  useFetcher,
  useSearchParams,
} from 'react-router-dom';
import { Button, TextInput, Typography } from 'ui-components';

import { getUserApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import LogoDarkBlue from '@/assets/logo-deepfence-dark-blue.svg';
import { ApiError, makeRequest } from '@/utils/api';
import storage from '@/utils/storage';

export type RegisterWithInviteActionReturnType = {
  error?: string;
  fieldErrors?: {
    firstName?: string;
    lastName?: string;
    password?: string;
    confirmPassword?: string;
  };
};

const action = async ({
  request,
}: ActionFunctionArgs): Promise<RegisterWithInviteActionReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  const inviteCode = formData.get('invite_code');

  if (password !== confirmPassword) {
    return {
      fieldErrors: {
        confirmPassword: 'passwords do not match',
      },
    };
  }

  const r = await makeRequest({
    apiFunction: getUserApiClient().registerInvitedUser,
    apiArgs: [
      {
        modelRegisterInvitedUserRequest: {
          code: inviteCode as string,
          first_name: body.firstName as string,
          last_name: body.lastName as string,
          password: body.password as string,
          is_temporary_password: false,
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<RegisterWithInviteActionReturnType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          fieldErrors: {
            firstName: modelResponse.error_fields?.first_name as string,
            lastName: modelResponse.error_fields?.last_name as string,
            password: modelResponse.error_fields?.password as string,
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

  storage.setAuth({
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
  });

  if (!r.onboarding_required) {
    throw redirect('/dashboard', 302);
  }

  throw redirect('/onboard', 302);
};

const RegisterWithInvite = () => {
  const fetcher = useFetcher<RegisterWithInviteActionReturnType>();
  const [searchParams] = useSearchParams();

  const { data } = fetcher;

  return (
    <fetcher.Form method="post">
      <div className="text-center">
        <img
          src={LogoDarkBlue}
          alt="Deefence Logo"
          width="55.46"
          height="34.74"
          className="m-auto"
        />
      </div>
      <h1
        className={cx(
          `${Typography.size['2xl']} ${Typography.weight.medium}`,
          'text-center leading-6 mb-6 mt-2',
        )}
      >
        Register
      </h1>
      <input
        type="hidden"
        name="invite_code"
        value={searchParams.get('invite_code') ?? ''}
      />
      <TextInput
        label="First Name"
        type={'text'}
        placeholder="First Name"
        sizing="sm"
        name="firstName"
        color={data?.fieldErrors?.firstName ? 'error' : 'default'}
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
        sizing="sm"
        name="lastName"
        className="mt-4"
        color={data?.fieldErrors?.lastName ? 'error' : 'default'}
      />
      {data?.fieldErrors?.lastName && (
        <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
          {data?.fieldErrors?.lastName}
        </p>
      )}
      <TextInput
        label="Password"
        type={'password'}
        placeholder="Password"
        sizing="sm"
        name="password"
        className="mt-4"
        color={data?.fieldErrors?.password ? 'error' : 'default'}
      />
      {data?.fieldErrors?.password && (
        <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
          {data?.fieldErrors?.password}
        </p>
      )}
      <TextInput
        label="Confirm Password"
        type={'password'}
        placeholder="Confirm Password"
        sizing="sm"
        name="confirmPassword"
        className="mt-4"
        color={data?.fieldErrors?.confirmPassword ? 'error' : 'default'}
      />
      {data?.fieldErrors?.confirmPassword && (
        <p className={`mt-1.5 ${Typography.size.sm} text-red-500`}>
          {data?.fieldErrors?.confirmPassword}
        </p>
      )}
      <div className="flex flex-col w-full mt-6">
        <Button size="md" color="primary" className="w-full" type="submit">
          Register
        </Button>
      </div>

      {data?.error && (
        <div className={`text-center mt-1.5 text-red-500 ${Typography.size.sm}`}>
          {data.error}
        </div>
      )}
      <div className={`py-4 flex flex-col text-center ${Typography.size.xs} leading-6`}>
        By Signing up you agree to our
        <Link to="/" className="text-blue-600 dark:text-blue-500">
          License Agreement
        </Link>
      </div>
      <div className={`flex flex-row justify-center ${Typography.size.xs} leading-6`}>
        Already have an account?
        <Link to="/auth/login" className="text-blue-600 dark:text-blue-500">
          &nbsp;Login
        </Link>
      </div>
    </fetcher.Form>
  );
};

export const module = {
  action,
  element: <RegisterWithInvite />,
};
