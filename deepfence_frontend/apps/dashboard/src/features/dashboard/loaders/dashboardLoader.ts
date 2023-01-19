import { LoaderFunction, redirect } from 'react-router-dom';

import storage from '@/utils/storage';

export const dashboardLoader: LoaderFunction = () => {
  if (!storage.getAuth()) {
    throw redirect('/auth/login');
  }
  throw redirect('/onboard');
};
