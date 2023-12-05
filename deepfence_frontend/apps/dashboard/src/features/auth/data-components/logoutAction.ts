import { toast } from 'sonner';

import { getAuthenticationApiClient } from '@/api/api';
import { getResponseErrors } from '@/utils/403';
import { apiWrapper, redirectToLogin } from '@/utils/api';
import storage from '@/utils/storage';

const action = async (): Promise<{
  error?: string;
}> => {
  const logoutApi = apiWrapper({
    fn: getAuthenticationApiClient().logout,
  });
  const logoutResponse = await logoutApi();
  if (!logoutResponse.ok) {
    const { message } = await getResponseErrors(logoutResponse.error);
    if (logoutResponse.error.response.status === 404) {
      return {
        error: message,
      };
    }
    toast.error(message);
    throw logoutResponse.error;
  }

  storage.clearAuth();

  throw redirectToLogin();
};

export const module = {
  action,
};
