import { LoaderFunctionArgs, redirect } from 'react-router-dom';

import storage from '@/utils/storage';

export const dashboardLoader = ({ request }: LoaderFunctionArgs) => {
  if (!storage.getAuth()) {
    throw redirect('/auth/login');
  }
  const url = new URL(request.url);
  if (url.pathname !== '/') {
    return null;
  }
  // TODO: if not onboarded, redirect to onboarding or on /dashboard
  throw redirect('/onboard');
};
