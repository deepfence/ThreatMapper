import { redirect } from 'react-router-dom';

import { ModelLoginResponse } from '@/api/generated';
import { validateRedirectToUrl } from '@/utils/api';
import storage from '@/utils/storage';

export function handleLoginAndRedirect(
  loginResponse: ModelLoginResponse,
  searchParams?: URLSearchParams,
): never {
  storage.setAuth({
    accessToken: loginResponse.access_token,
    refreshToken: loginResponse.refresh_token,
  });

  if (loginResponse.onboarding_required) {
    throw redirect('/onboard', 302);
  }

  const redirectTo = searchParams?.get('redirectTo');
  if (redirectTo && validateRedirectToUrl(redirectTo)) {
    throw redirect(redirectTo, 302);
  }

  throw redirect('/dashboard', 302);
}
