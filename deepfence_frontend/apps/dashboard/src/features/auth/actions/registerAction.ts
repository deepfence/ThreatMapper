import { ActionFunction } from 'react-router-dom';

import { getUserApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { handleLoginAndRedirect } from '@/utils/auth';

export type RegisterActionReturnType = {
  error?: string;
  fieldErrors?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    company?: string;
  };
};

export const registerAction: ActionFunction = async ({
  request,
}): Promise<RegisterActionReturnType> => {
  const formData = await request.formData();
  // add console_url which is the origin of request
  formData.append('consoleUrl', window.location.origin);
  const body = Object.fromEntries(formData);
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  if (password !== confirmPassword) {
    return {
      fieldErrors: {
        confirmPassword: 'passwords do not match',
      },
    };
  }
  const registerUserApi = apiWrapper({
    fn: getUserApiClient().registerUser,
    options: { handleAuthError: false },
  });
  const registerUserResponse = await registerUserApi({
    modelUserRegisterRequest: {
      first_name: body.firstName as string,
      last_name: body.lastName as string,
      email: body.email as string,
      password: body.password as string,
      company: body.company as string,
      console_url: body.consoleUrl as string,
      is_temporary_password: false,
    },
  });
  if (!registerUserResponse.ok) {
    if (registerUserResponse.error.response.status === 400) {
      const modelResponse: ApiDocsBadRequestResponse =
        await registerUserResponse.error.response.json();
      return {
        fieldErrors: {
          firstName: modelResponse.error_fields?.first_name as string,
          lastName: modelResponse.error_fields?.last_name as string,
          email: modelResponse.error_fields?.email as string,
          password: modelResponse.error_fields?.password as string,
          company: modelResponse.error_fields?.company as string,
        },
      };
    } else if (registerUserResponse.error.response.status === 403) {
      const message = await get403Message(registerUserResponse.error);
      return {
        error: message,
      };
    }
    throw registerUserResponse.error;
  }

  handleLoginAndRedirect(registerUserResponse.value);
};
