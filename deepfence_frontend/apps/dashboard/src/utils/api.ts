import { getAuthenticationApiClient } from '@/api/api';
import { ModelResponseAccessToken, ResponseError } from '@/api/generated';
import { showUserInfoGuard, waitForUserInfoGuard } from '@/components/UserInfoGuard';
import { queryClient } from '@/queries/client';
import { historyHelper } from '@/utils/router';
import storage from '@/utils/storage';
import { sleep } from '@/utils/timers';
import { isThreatMapper } from '@/utils/version';

export const isResponse = (response: unknown): response is Response => {
  return response instanceof Response;
};

export const isResponseError = (
  responseError: unknown,
): responseError is ResponseError => {
  return responseError instanceof ResponseError;
};

// global promise object
let refreshTokenPromise: Promise<ModelResponseAccessToken> | null = null;

async function refreshAccessTokenIfPossible(): Promise<boolean> {
  function cleanup() {
    refreshTokenPromise = null;
  }
  const auth = storage.getAuth();
  if (!auth?.refreshToken?.length) {
    storage.clearAuth();
    throw redirectToLogin();
  }
  try {
    if (!refreshTokenPromise) {
      const headers = new Headers();
      headers.append('Authorization', `Bearer ${auth.refreshToken}`);
      refreshTokenPromise = getAuthenticationApiClient().refreshAccessToken({
        headers,
      });
    }
    const response = await refreshTokenPromise;
    if (response.access_token && response.refresh_token) {
      storage.setAuth({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      });
    } else {
      throw new Error('Failed to refresh access token');
    }
  } catch (e: unknown) {
    if (isResponseError(e) && e.response.status === 401) {
      storage.clearAuth();
      cleanup();
      throw redirectToLogin();
    }
    console.error('Unknown error while refreshing accessToken');
    console.error(e);
  }
  cleanup();
  return true;
}

export function redirectToLogin() {
  const searchParams = new URLSearchParams();
  const url = new URL(window.location.href);
  const existingRedirectTo = url.searchParams.get('redirectTo');
  searchParams.append(
    'redirectTo',
    existingRedirectTo ? existingRedirectTo : `${url.pathname}${url.search}`,
  );
  queryClient.clear();
  return historyHelper.navigate(`/auth/login?${searchParams.toString()}`);
}

export async function requireLogin() {
  const auth = storage.getAuth();
  if (auth) return auth;
  storage.clearAuth();
  throw redirectToLogin();
}

export function validateRedirectToUrl(redirectTo: string) {
  if (!redirectTo) return true;
  if (!redirectTo.startsWith('/')) return false;
  return true;
}

type Result<T, E> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: E;
    };

type Func<T extends any[], R> = (...a: T) => R;

export function apiWrapper<F extends Func<any[], any>>({
  fn,
  options,
}: {
  fn: F;
  options?: {
    handleAuthError?: boolean;
  };
}): Func<Parameters<F>, Promise<Result<Awaited<ReturnType<F>>, ResponseError>>> {
  return async (...args: Parameters<F>) => {
    try {
      const value = await fn(...args);
      return { ok: true, value: value };
    } catch (error) {
      if (isResponseError(error)) {
        if (error.response.status === 401 && options?.handleAuthError !== false) {
          if (await refreshAccessTokenIfPossible()) {
            return apiWrapper({ fn, options })(...args);
          }
        } else if (error.response.status === 503) {
          throw new Error('Service unavailable', {
            cause: { status: 503 },
          });
        } else if (error.response.status === 402 && isThreatMapper) {
          showUserInfoGuard();
          if (await waitForUserInfoGuard()) {
            if (await refreshAccessTokenIfPossible()) {
              return apiWrapper({ fn, options })(...args);
            }
          } else {
            const response = new Response(
              JSON.stringify({
                message: '',
                error_fields: {},
                error_index: null,
              }),
              {
                status: 400,
                statusText: 'Bad Request',
                headers: {
                  'Content-Type': 'application/json',
                },
              },
            );
            return { ok: false, error: new ResponseError(response) };
          }
        }
        return { ok: false, error };
      }

      console.error(`unknown error while calling ${fn.name}`);
      console.error(error);
      throw error;
    }
  };
}

export const retryUntilResponseHasValue = async <F extends Func<any[], any>>(
  fn: F,
  fnParams: Parameters<F>,
  checkResponseHasValue: (
    response: Awaited<ReturnType<F>>,
    show: boolean,
  ) => Promise<boolean>,
  showToast = true,
): Promise<ReturnType<F>> => {
  const response = await fn(...fnParams);
  const isPresent = await checkResponseHasValue(response, showToast);
  if (!isPresent) {
    await sleep(3000);
    return retryUntilResponseHasValue(fn, fnParams, checkResponseHasValue, isPresent);
  }
  return response;
};
