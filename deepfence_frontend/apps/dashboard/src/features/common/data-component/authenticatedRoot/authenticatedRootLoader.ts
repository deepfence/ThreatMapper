import { LoaderFunctionArgs, redirect } from 'react-router-dom';

import { requireLogin } from '@/utils/api';

export const authenticatedRootLoader = async ({ request }: LoaderFunctionArgs) => {
  await requireLogin();
  const url = new URL(request.url);
  if (url.pathname !== '/') {
    return null;
  }
  // TODO: if not onboarded, redirect to onboarding or on /dashboard
  throw redirect('/onboard');
};
