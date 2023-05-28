import { useEffect } from 'react';
import { useFetcher } from 'react-router-dom';

import { getUserApiClient } from '@/api/api';
import { ModelUser } from '@/api/generated';
import { apiWrapper } from '@/utils/api';

export const getUserApiLoader = async (): Promise<{
  error?: string;
  user?: ModelUser;
}> => {
  const getCurrentUserApi = apiWrapper({
    fn: getUserApiClient().getCurrentUser,
  });
  const getCurrentUserResponse = await getCurrentUserApi();
  if (!getCurrentUserResponse.ok) {
    if (
      getCurrentUserResponse.error.response.status === 404 ||
      getCurrentUserResponse.error.response.status === 401
    ) {
      return {
        error: 'Unable to get current user',
      };
    }
    throw getCurrentUserResponse.error;
  }
  return {
    user: getCurrentUserResponse.value,
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
