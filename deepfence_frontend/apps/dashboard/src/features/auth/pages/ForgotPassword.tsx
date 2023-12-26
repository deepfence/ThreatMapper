import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { Button, TextInput } from 'ui-components';

import { getUserApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { get403Message } from '@/utils/403';
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
    options: { handleAuthError: false },
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
      const message = await get403Message(resetPasswordResponse.error);
      return {
        success: false,
        error: message,
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
        <h1 className="text-text-text-and-icon text-h2 text-center">Forgot Password</h1>
        <p className="mt-4 text-text-text-and-icon text-p7">
          Enter your email address registered with your account. We’ll send you a link to
          reset your password
        </p>
        <TextInput
          className="mt-6"
          label="Email"
          type="email"
          placeholder="Enter email"
          name="email"
          color={data?.fieldErrors?.email ? 'error' : 'default'}
          helperText={data?.fieldErrors?.email}
        />
        {data?.message && (
          <p className={`my-1.5 text-p7 text-center text-status-success`}>
            {data.message}
          </p>
        )}
        <div className="flex flex-col w-full mt-8">
          <Button
            size="md"
            className="w-full"
            loading={state === 'submitting'}
            disabled={state === 'submitting'}
            type="submit"
          >
            Send Link
          </Button>
          <DFLink
            to="/auth/login"
            className="mt-4 text-p4 underline text-accent-accent text-center"
            unstyled
          >
            Back to login
          </DFLink>
        </div>
      </fetcher.Form>
    </>
  );
};
