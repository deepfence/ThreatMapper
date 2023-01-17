import { ActionFunction, redirect } from 'react-router-dom';

import { getUserApiClient } from '@/api/api';
import { ModelResponse } from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';
import storage from '@/utils/storage';

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

  const r = await makeRequest({
    apiFunction: getUserApiClient().registerUser,
    apiArgs: [
      {
        modelUserRegisterRequest: {
          first_name: body.firstName as string,
          last_name: body.lastName as string,
          email: body.email as string,
          password: body.password as string,
          company: body.company as string,
          console_url: body.consoleUrl as string,
          is_temporary_password: false,
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<RegisterActionReturnType>({});
      if (r.status === 400) {
        const modelResponse: ModelResponse = await r.json();
        return error.set({
          fieldErrors: {
            firstName: modelResponse.error_fields?.first_name as string,
            lastName: modelResponse.error_fields?.last_name as string,
            email: modelResponse.error_fields?.email as string,
            password: modelResponse.error_fields?.password as string,
            company: modelResponse.error_fields?.company as string,
          },
        });
      } else if (r.status === 403) {
        const modelResponse: ModelResponse = await r.json();
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
    accessToken: r.data!.access_token,
    refreshToken: r.data!.refresh_token,
  });
  throw redirect('/onboard', 302);
};
