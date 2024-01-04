import { useState } from 'react';
import { ActionFunctionArgs, Link, useFetcher, useSearchParams } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import { Button, Checkbox, TextInput } from 'ui-components';

import { getUserApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { handleLoginAndRedirect } from '@/utils/auth';

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
  const registerInvitedUserApi = apiWrapper({
    fn: getUserApiClient().registerInvitedUser,
    options: { handleAuthError: false },
  });
  const registerInvitedUserResponse = await registerInvitedUserApi({
    modelRegisterInvitedUserRequest: {
      code: inviteCode as string,
      first_name: body.firstName as string,
      last_name: body.lastName as string,
      password: body.password as string,
      namespace: body.namespace as string,
      is_temporary_password: false,
    },
  });
  if (!registerInvitedUserResponse.ok) {
    if (registerInvitedUserResponse.error.response.status === 400) {
      const modelResponse: ApiDocsBadRequestResponse =
        await registerInvitedUserResponse.error.response.json();
      return {
        error: modelResponse.message || modelResponse.error_fields?.code,
        fieldErrors: {
          firstName: modelResponse.error_fields?.first_name as string,
          lastName: modelResponse.error_fields?.last_name as string,
          password: modelResponse.error_fields?.password as string,
        },
      };
    } else if (registerInvitedUserResponse.error.response.status === 403) {
      const message = await get403Message(registerInvitedUserResponse.error);
      return {
        error: message,
      };
    }
    throw registerInvitedUserResponse.error;
  }
  handleLoginAndRedirect(registerInvitedUserResponse.value);
};

const RegisterWithInvite = () => {
  const fetcher = useFetcher<RegisterWithInviteActionReturnType>();
  const [searchParams] = useSearchParams();
  const [eulaAccepted, setEulaAccepted] = useState(false);

  const { data, state } = fetcher;

  return (
    <fetcher.Form method="post">
      <h1 className="text-text-text-and-icon text-h2 text-center">
        Register for Deepfence
      </h1>
      <input
        type="hidden"
        name="invite_code"
        value={searchParams.get('invite_code') ?? ''}
      />
      <input type="hidden" name="namespace" value={searchParams.get('namespace') ?? ''} />
      <TextInput
        className="mt-8"
        label="First Name"
        type={'text'}
        placeholder="First Name"
        name="firstName"
        color={data?.fieldErrors?.firstName ? 'error' : 'default'}
        helperText={data?.fieldErrors?.firstName}
      />
      <TextInput
        label="Last Name"
        type={'text'}
        placeholder="Last Name"
        name="lastName"
        className="mt-8"
        color={data?.fieldErrors?.lastName ? 'error' : 'default'}
        helperText={data?.fieldErrors?.lastName}
      />
      <TextInput
        label="Password"
        type={'password'}
        placeholder="Password"
        name="password"
        className="mt-8"
        color={data?.fieldErrors?.password ? 'error' : 'default'}
        helperText={data?.fieldErrors?.password}
      />
      <TextInput
        label="Confirm Password"
        type={'password'}
        placeholder="Confirm Password"
        name="confirmPassword"
        className="mt-8"
        color={data?.fieldErrors?.confirmPassword ? 'error' : 'default'}
        helperText={data?.fieldErrors?.confirmPassword}
      />

      <div className={`mt-8 text-p7`}>
        <Checkbox
          checked={eulaAccepted}
          onCheckedChange={(checked) => {
            if (typeof checked === 'boolean') {
              setEulaAccepted(checked);
            }
          }}
          label={
            <div className="text-p7">
              I agree to terms and conditions outlined in{' '}
              <Link
                to="/end-user-license-agreement"
                className="text-text-link"
                target="_blank"
              >
                License Agreement
              </Link>
            </div>
          }
        />
      </div>
      {data?.error && (
        <div className={`text-center mt-1.5 text-p7 text-status-error`}>{data.error}</div>
      )}
      <div
        className={cn('flex flex-col w-full mt-6', {
          'mt-4 ': data?.error?.length,
        })}
      >
        <Button
          size="md"
          className="w-full"
          type="submit"
          disabled={state !== 'idle' || !eulaAccepted}
          loading={state !== 'idle'}
        >
          Register
        </Button>
      </div>

      <div
        className={`flex flex-row justify-center text-p7 mt-4 text-text-text-and-icon`}
      >
        Already have an account?&nbsp;
        <DFLink to="/auth/login" className="underline text-accent-accent" unstyled>
          Login
        </DFLink>
      </div>
    </fetcher.Form>
  );
};

export const module = {
  action,
  element: <RegisterWithInvite />,
};
