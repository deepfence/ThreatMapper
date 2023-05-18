import cx from 'classnames';
import { ActionFunctionArgs, Link, useFetcher, useSearchParams } from 'react-router-dom';
import { Button, TextInput, Typography } from 'ui-components';

import { getUserApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import LogoDarkBlue from '@/assets/logo-deepfence-dark-blue.svg';
import { apiWrapper } from '@/utils/api';

export type ResetPasswordActionReturnType = {
  error?: string;
  fieldErrors?: {
    password?: string;
    confirmPassword?: string;
  };
  success?: boolean;
};

const action = async ({
  request,
}: ActionFunctionArgs): Promise<ResetPasswordActionReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  const code = formData.get('code');

  if (password !== confirmPassword) {
    return {
      fieldErrors: {
        confirmPassword: 'passwords do not match',
      },
    };
  }
  const verifyResetPasswordRequest = apiWrapper({
    fn: getUserApiClient().verifyResetPasswordRequest,
  });
  const response = await verifyResetPasswordRequest({
    modelPasswordResetVerifyRequest: {
      code: code as string,
      password: body.password as string,
    },
  });

  if (!response.ok) {
    if (response.error.response.status === 404) {
      return {
        error: 'Verification URL expired. Please request a new one.',
      };
    } else if (response.error.response.status === 400) {
      const modelResponse: ApiDocsBadRequestResponse =
        await response.error.response.json();
      return {
        fieldErrors: {
          password: modelResponse.error_fields?.password as string,
        },
      };
    }
    throw response.error;
  }

  return {
    success: true,
  };
};

const ResetPassword = () => {
  const fetcher = useFetcher<ResetPasswordActionReturnType>();
  const [searchParams] = useSearchParams();

  const { data, state } = fetcher;

  return !data?.success ? (
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
        Reset Password
      </h1>
      <input type="hidden" name="code" value={searchParams.get('code') ?? ''} />

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
        <Button
          size="md"
          color="primary"
          className="w-full"
          type="submit"
          disabled={state !== 'idle'}
          loading={state !== 'idle'}
        >
          Reset
        </Button>
      </div>

      {data?.error && (
        <div className={`text-center mt-1.5 text-red-500 ${Typography.size.sm}`}>
          {data.error}
        </div>
      )}
    </fetcher.Form>
  ) : (
    <div
      className={`text-center mt-1.5 text-green-500 ${Typography.size.sm} flex flex-col`}
    >
      <h1>Password successfully updated!!! </h1>
      <span>
        click here to{' '}
        <Link to="/auth/login" className="text-blue-600 dark:text-blue-500">
          Login
        </Link>
      </span>
    </div>
  );
};

export const module = {
  action,
  element: <ResetPassword />,
};
