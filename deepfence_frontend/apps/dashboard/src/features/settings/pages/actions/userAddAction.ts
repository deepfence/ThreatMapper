import { ActionFunction, redirect } from 'react-router-dom';

import { getUserApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelUpdateUserIdRequestRoleEnum,
} from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';
import storage from '@/utils/storage';

export type UpdateActionReturnType = {
  error?: string;
  fieldErrors?: {
    firstName?: string;
    lastName?: string;
    role?: ModelUpdateUserIdRequestRoleEnum;
    status?: boolean;
  };
};

export const userAddAction: ActionFunction = async ({
  request,
}): Promise<UpdateActionReturnType> => {
  const formData = await request.formData();
  // add console_url which is the origin of request
  formData.append('consoleUrl', window.location.origin);
  const body = Object.fromEntries(formData);

  const r = await makeRequest({
    apiFunction: getUserApiClient().updateUser,
    apiArgs: [
      {
        id: Number(body.id),
        modelUpdateUserIdRequest: {
          first_name: body.firstName as string,
          last_name: body.lastName as string,
          role: body.role as ModelUpdateUserIdRequestRoleEnum,
          is_active: body.status === 'true',
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<UpdateActionReturnType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          fieldErrors: {
            firstName: modelResponse.error_fields?.first_name as string,
            lastName: modelResponse.error_fields?.last_name as string,
            status: Boolean(modelResponse.error_fields?.is_active),
            role: modelResponse.error_fields?.role as ModelUpdateUserIdRequestRoleEnum,
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
  throw redirect('/settings/user-management', 302);
};
