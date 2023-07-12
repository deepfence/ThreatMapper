import { requireLogin } from '@/utils/api';

export const authenticatedRootLoader = async () => {
  const auth = await requireLogin();
  let email = '';
  try {
    email = JSON.parse(atob(auth?.accessToken?.split?.('.')?.[1]) ?? '{}')?.email ?? '';
  } catch (e) {
    console.error('error decoding token to get email.');
  }
  return {
    email,
  };
};
