import { toast } from 'sonner';

import { getAuthenticationApiClient } from '@/api/api';
import { ApiError, makeRequest, redirectToLogin } from '@/utils/api';
import storage from '@/utils/storage';

const action = async (): Promise<{
  error?: string;
}> => {
  const r = await makeRequest({
    apiFunction: getAuthenticationApiClient().logout,
    apiArgs: [],
    errorHandler: async (r) => {
      const error = new ApiError<{
        error: string;
      }>({
        error: '',
      });
      if (r.status === 404) {
        return error.set({
          error: 'Unable to logout, something is wrong',
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    toast.error(r.value().error);
    return r.value();
  }

  storage.clearAuth();

  throw redirectToLogin();
};

export const module = {
  action,
};
