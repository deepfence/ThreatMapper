import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getSettingsApiClient, getUserApiClient } from '@/api/api';
import { apiWrapper } from '@/utils/api';

export const settingQueries = createQueryKeys('setting', {
  listScheduledJobs: () => {
    return {
      queryKey: ['listScheduledJobs'],
      queryFn: async () => {
        const getScheduledTasks = apiWrapper({
          fn: getSettingsApiClient().getScheduledTasks,
        });

        const response = await getScheduledTasks();

        if (!response.ok) {
          if (response.error.response.status === 403) {
            return {
              message: 'You do not have enough permissions to view sheduled jobs',
            };
          }
          throw response.error;
        }
        return {
          data: response.value,
        };
      },
    };
  },
  listUserActivityLogs: () => {
    return {
      queryKey: ['listUserActivityLogs'],
      queryFn: async () => {
        const userApi = apiWrapper({
          fn: getSettingsApiClient().getUserActivityLogs,
        });
        const userResponse = await userApi();
        if (!userResponse.ok) {
          if (userResponse.error.response.status === 400) {
            return {
              message: userResponse.error.message,
            };
          } else if (userResponse.error.response.status === 403) {
            return {
              message: 'You do not have enough permissions to view user audit logs',
            };
          }
          throw userResponse.error;
        }

        return {
          data: userResponse.value,
        };
      },
    };
  },
  listGlobalSettings: () => {
    return {
      queryKey: ['listGlobalSettings'],
      queryFn: async () => {
        const settingsApi = apiWrapper({
          fn: getSettingsApiClient().getSettings,
        });
        const settingsResponse = await settingsApi();
        if (!settingsResponse.ok) {
          if (settingsResponse.error.response.status === 400) {
            return {
              message: settingsResponse.error.message,
            };
          } else if (settingsResponse.error.response.status === 403) {
            return {
              message: 'You do not have enough permissions to view settings',
            };
          }
          throw settingsResponse.error;
        }

        return {
          data: settingsResponse.value,
        };
      },
    };
  },
  getEmailConfiguration: () => {
    return {
      queryKey: ['getEmailConfiguration'],
      queryFn: async () => {
        const emailApi = apiWrapper({
          fn: getSettingsApiClient().getEmailConfiguration,
        });
        const emailResponse = await emailApi();
        if (!emailResponse.ok) {
          if (
            emailResponse.error.response.status === 400 ||
            emailResponse.error.response.status === 409
          ) {
            return {
              message: emailResponse.error.message,
            };
          } else if (emailResponse.error.response.status === 403) {
            return {
              message: 'You do not have enough permissions to view email configurations',
            };
          }
          throw emailResponse.error;
        }

        return {
          data: emailResponse.value,
        };
      },
    };
  },
  listUsers: () => {
    return {
      queryKey: ['listUsers'],
      queryFn: async () => {
        const getUsers = apiWrapper({ fn: getUserApiClient().getUsers });
        const users = await getUsers();

        if (!users.ok) {
          if (users.error.response?.status === 403) {
            return {
              message: 'You do not have enough permissions to view users',
            };
          }
          throw users.error;
        }

        return {
          data: users.value,
        };
      },
    };
  },
});
