import { redirect } from 'react-router-dom';

import { authenticationApi } from '../../../api/api';
import { ModelResponse, ResponseError } from '../../../api/generated';
import storage from '../../../utils/storage';

export const loginAction = async ({
  request,
}: {
  request: Request;
  params: Record<string, unknown>;
}) => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  try {
    await authenticationApi.login({
      modelLoginRequest: body,
    });
  } catch (e) {
    const error = e as ResponseError;
    const response: ModelResponse = await error.response.json();
    return {
      error_fields: response.error_fields,
      message: response.message,
    };
  }
  storage.setAuth({ isLogin: true });
  return redirect('/onboard', 302);
};
