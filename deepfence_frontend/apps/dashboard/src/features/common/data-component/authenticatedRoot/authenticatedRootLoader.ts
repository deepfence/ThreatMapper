import { requireLogin } from '@/utils/api';

export const authenticatedRootLoader = async () => {
  await requireLogin();
  return null;
};
