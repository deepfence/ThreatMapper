import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getUserApiClient } from '@/api/api';
import { apiWrapper } from '@/utils/api';

export const userQueries = createQueryKeys('auth', {
  apiToken: () => {
    return {
      queryKey: ['apiToken'],
      queryFn: async () => {
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
      },
    };
  },
  currentUser: () => {
    return {
      queryKey: ['currentUser'],
      queryFn: async () => {
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
      },
    };
  },
});
