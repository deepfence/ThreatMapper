import {
  QueryClient,
  QueryFunction,
  QueryKey,
  useQuery,
  UseQueryOptions,
} from 'react-query';

import { router } from '@/routes';
import { isResponseError } from '@/utils/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

export const useAuthedQuery = <
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryKey: TQueryKey,
  queryFn: QueryFunction<TQueryFnData, TQueryKey>,
  options?: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
    'queryKey' | 'queryFn'
  >,
) => {
  return useQuery<TQueryFnData, TError, TData, TQueryKey>(queryKey, queryFn, {
    ...options,
    onError: (error) => {
      // if the error is auth related, redirect to login
      if (isResponseError(error)) {
        if (error.response.status === 401) {
          router.navigate('/auth/login');
        }
      }
    },
  });
};
