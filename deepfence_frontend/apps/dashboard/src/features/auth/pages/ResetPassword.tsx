import { ActionFunctionArgs, useFetcher, useSearchParams } from 'react-router-dom';
import { Button, TextInput } from 'ui-components';

import { getUserApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
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
      namespace: body.namespace as string,
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
      <h1 className="text-text-text-and-icon text-h2 text-center">Reset Password</h1>
      <input type="hidden" name="code" value={searchParams.get('code') ?? ''} />
      <input type="hidden" name="namespace" value={searchParams.get('namespace') ?? ''} />

      <TextInput
        label="Password"
        type={'password'}
        placeholder="Password"
        name="password"
        className="mt-4"
        color={data?.fieldErrors?.password ? 'error' : 'default'}
        helperText={data?.fieldErrors?.password}
      />

      <TextInput
        label="Confirm Password"
        type={'password'}
        placeholder="Confirm Password"
        name="confirmPassword"
        className="mt-4"
        color={data?.fieldErrors?.confirmPassword ? 'error' : 'default'}
        helperText={data?.fieldErrors?.confirmPassword}
      />
      {data?.error && (
        <div className={`my-1.5 text-p7 text-center text-status-error`}>{data.error}</div>
      )}
      <div className="flex flex-col w-full mt-8">
        <Button
          size="md"
          className="w-full"
          type="submit"
          loading={state === 'submitting'}
          disabled={state === 'submitting'}
        >
          Reset
        </Button>
      </div>
    </fetcher.Form>
  ) : (
    <div className={`mt-1.5 flex flex-col`}>
      <h1 className="text-status-success text-p4 text-center">
        Password updated successfully
      </h1>
      <DFLink
        to="/auth/login"
        className="mt-4 text-p4 underline dark:text-accent-accent text-center"
        unstyled
      >
        Login Now
      </DFLink>
    </div>
  );
};

export const module = {
  action,
  element: <ResetPassword />,
};
