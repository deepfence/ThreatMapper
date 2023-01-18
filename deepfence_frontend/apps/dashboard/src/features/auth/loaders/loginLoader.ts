import { LoaderFunction, redirect } from 'react-router-dom';

import storage from '@/utils/storage';

export const loginLoader: LoaderFunction = () => {
  if (storage.getAuth()) {
    throw redirect('/onboard', 302);
  }
  return null;
};
