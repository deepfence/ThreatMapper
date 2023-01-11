import { redirect } from 'react-router-dom';

import { userApi } from '../../../api/api';
import { ModelResponse, ResponseError } from '../../../api/generated';

export const registeruserAction = async ({
  request,
}: {
  request: Request;
  params: Record<string, unknown>;
}) => {
  const formData = await request.formData();
  // add console_url which is the origin of request
  formData.append('console_url', window.location.origin);
  const body = Object.fromEntries(formData);
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  try {
    await userApi.registerUser({
      modelUserRegisterRequest: body,
    });
  } catch (e) {
    const error = e as ResponseError;
    const response: ModelResponse = await error.response.json();
    if (password != confirmPassword) {
      response.error_fields = {
        ...response.error_fields,
        confirmPassword: 'Confirm password and password are not same',
      };
    }
    if (confirmPassword === '') {
      response.error_fields = {
        ...response.error_fields,
        confirmPassword: response.error_fields?.password || '',
      };
    }
    return {
      error_fields: response.error_fields,
      message: response.message,
    };
  }
  return redirect('/auth/login', 302);
};
