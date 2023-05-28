import { useEffect } from 'react';
import { useFetcher } from 'react-router-dom';

import { getUserApiClient } from '@/api/api';
import { ModelApiTokenResponse } from '@/api/generated';
import { apiWrapper } from '@/utils/api';

export const getApiTokenApiLoader = async (): Promise<{
  error?: string;
  apiToken?: ModelApiTokenResponse;
}> => {
  const getApiTokensApi = apiWrapper({
    fn: getUserApiClient().getApiTokens,
  });
  const getApiTokensResponse = await getApiTokensApi();
  if (!getApiTokensResponse.ok) {
    if (
      getApiTokensResponse.error.response.status === 404 ||
      getApiTokensResponse.error.response.status === 401
    ) {
      return {
        error: 'Unable to get api token',
      };
    }
    throw getApiTokensResponse.error;
  }

  return {
    apiToken: getApiTokensResponse.value[0],
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
