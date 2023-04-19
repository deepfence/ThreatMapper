import { useEffect } from 'react';
import { useFetcher } from 'react-router-dom';

import { getUserApiClient } from '@/api/api';
import { ModelApiTokenResponse } from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';

export const getApiTokenApiLoader = async (): Promise<{
  error?: string;
  apiToken?: ModelApiTokenResponse;
}> => {
  const token = await makeRequest({
    apiFunction: getUserApiClient().getApiTokens,
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

  if (ApiError.isApiError(token)) {
    return token.value();
  }
  return {
    apiToken: token[0],
  };
};

export const useGetApiToken = (): {
  status: 'idle' | 'loading' | 'submitting';
  data: ModelApiTokenResponse | undefined;
} => {
  const fetcher = useFetcher<{
    apiToken: ModelApiTokenResponse;
  }>();

  useEffect(() => {
    fetcher.load('/data-component/auth/apiToken');
  }, []);

  return {
    status: fetcher.state,
    data: fetcher.data?.apiToken,
  };
};
