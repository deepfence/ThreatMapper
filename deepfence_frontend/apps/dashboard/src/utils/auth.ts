import { redirect } from 'react-router-dom';

import { ModelLoginResponse } from '@/api/generated';
import { handleThreatMapperCommunicationMessages } from '@/components/DfCommunication';
import { validateRedirectToUrl } from '@/utils/api';
import storage from '@/utils/storage';

export async function handleLoginAndRedirect(
  loginResponse: ModelLoginResponse,
  searchParams?: URLSearchParams,
): Promise<never> {
  storage.setAuth({
    accessToken: loginResponse.access_token,
    refreshToken: loginResponse.refresh_token,
  });

  await handleThreatMapperCommunicationMessages();

  if (loginResponse.onboarding_required) {
    throw redirect('/onboard', 302);
  }

  const redirectTo = searchParams?.get('redirectTo');
  if (redirectTo && validateRedirectToUrl(redirectTo)) {
    throw redirect(redirectTo, 302);
  }

  throw redirect('/dashboard', 302);
}
