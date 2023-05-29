import cx from 'classnames';
import { ActionFunctionArgs, Link, useFetcher } from 'react-router-dom';
import { Button, TextInput, Typography } from 'ui-components';

import { getUserApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import LogoDarkBlue from '@/assets/logo-deepfence-dark-blue.svg';
import { apiWrapper } from '@/utils/api';

export type actionReturnType = {
  error?: string;
  fieldErrors?: {
    email?: string;
  };
  message?: string;
  success?: boolean;
};

export const forgotPasswordAction = async ({
  request,
}: ActionFunctionArgs): Promise<actionReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);

  const resetPasswordRequestApi = apiWrapper({
    fn: getUserApiClient().resetPasswordRequest,
  });
  const resetPasswordResponse = await resetPasswordRequestApi({
    modelPasswordResetRequest: {
      email: body.email as string,
    },
  });
  if (!resetPasswordResponse.ok) {
    if (resetPasswordResponse.error.response.status === 400) {
      const modelResponse: ApiDocsBadRequestResponse =
        await resetPasswordResponse.error.response.json();
      return {
        fieldErrors: {
          email: modelResponse.error_fields?.email as string,
        },
      };
    } else if (resetPasswordResponse.error.response.status === 403) {
      return {
        success: false,
        error: 'You do not have enough permissions to reset password',
      };
    }
    throw resetPasswordResponse.error;
  }
  return {
    success: true,
    message: resetPasswordResponse.value.message,
  };
};

export const ForgotPassword = () => {
  const fetcher = useFetcher();
  const { data, state } = fetcher;

  return (
    <>
      <fetcher.Form method="post">
        <div className="text-center">
          <img
            src={LogoDarkBlue}
            alt="Deefence Logo"
            width="55.46'"
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
          Forgot Password
        </h1>
        <p className={`${Typography.size.sm} mb-2.5`}>
          Provide the email registered with your account.
        </p>
        <TextInput
          label="Email Address"
          type="email"
          placeholder="Email"
          sizing="sm"
          name="email"
          required
          color={data?.fieldErrors?.email ? 'error' : 'default'}
          helperText={data?.fieldErrors?.email}
        />

        <div className="flex flex-col w-full mt-6">
          <Button
            size="md"
            color="primary"
            className="w-full mb-4"
            loading={state === 'submitting'}
            disabled={state === 'submitting'}
            type="submit"
          >
            Send Link
          </Button>
          <Link
            to="/auth/login"
            className={cx(
              `${Typography.size.xs} `,
              'bg-transparent text-center text-blue-600 dark:text-blue-500',
            )}
          >
            Back to Login
          </Link>
        </div>
      </fetcher.Form>
      {data?.message && (
        <p className={`mt-1.5 ${Typography.size.sm} text-green-500 relative text-center`}>
          {data.message}
        </p>
      )}
    </>
  );
};
