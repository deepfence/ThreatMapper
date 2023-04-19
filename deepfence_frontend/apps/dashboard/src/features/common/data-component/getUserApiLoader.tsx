import { useEffect } from 'react';
import { useFetcher } from 'react-router-dom';

import { getUserApiClient } from '@/api/api';
import { ModelUser } from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';

export const getUserApiLoader = async (): Promise<{
  error?: string;
  user?: ModelUser;
}> => {
  const user = await makeRequest({
    apiFunction: getUserApiClient().getCurrentUser,
    apiArgs: [],
    errorHandler: async (r) => {
      const error = new ApiError<{ error?: string }>({});
      if (r.status === 404 || r.status === 401) {
        return error.set({
          error: 'Unable to get api token',
        });
      }
    },
  });

  if (ApiError.isApiError(user)) {
    return user.value();
  }
  return {
    user: user,
  };
};

export const useGetCurrentUser = (): {
  status: 'idle' | 'loading' | 'submitting';
  data: ModelUser | undefined;
} => {
  const fetcher = useFetcher<{
    user: ModelUser;
  }>();

  useEffect(() => {
    fetcher.load('/data-component/auth/user');
  }, []);

  return {
    status: fetcher.state,
    data: fetcher.data?.user,
  };
};
