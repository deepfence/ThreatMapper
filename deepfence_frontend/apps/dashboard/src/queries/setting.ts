import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getDiagnosisApiClient, getSettingsApiClient, getUserApiClient } from '@/api/api';
import { ModelGetAuditLogsRequest } from '@/api/generated';
import { get403Message, getResponseErrors } from '@/utils/403';
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
            const message = await get403Message(response.error);
            return {
              message,
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
  listUserActivityLogs: (filters: { page: number; pageSize: number }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async () => {
        const { page, pageSize } = filters;
        const logsReq: ModelGetAuditLogsRequest = {
          window: {
            offset: page * pageSize,
            size: pageSize,
          },
        };

        const userApi = apiWrapper({
          fn: getSettingsApiClient().getUserActivityLogs,
        });
        const userPromise = userApi({
          modelGetAuditLogsRequest: logsReq,
        });

        const logsCountApi = apiWrapper({
          fn: getSettingsApiClient().getUserActivityLogCount,
        });
        const logsCountPromise = logsCountApi();

        const [userResponse, logsCount] = await Promise.all([
          userPromise,
          logsCountPromise,
        ]);

        if (!userResponse.ok) {
          if (userResponse.error.response.status === 400) {
            const { message } = await getResponseErrors(userResponse.error);
            return {
              message,
            };
          } else if (userResponse.error.response.status === 403) {
            const message = await get403Message(userResponse.error);
            return {
              message,
            };
          }
          throw userResponse.error;
        }

        if (!logsCount.ok) {
          if (logsCount.error.response.status === 400) {
            const { message } = await getResponseErrors(logsCount.error);
            return {
              message,
            };
          } else if (logsCount.error.response.status === 403) {
            const message = await get403Message(logsCount.error);
            return {
              message,
            };
          }
          throw logsCount.error;
        }

        return {
          data: userResponse.value,
          pagination: {
            currentPage: page,
            totalRows: logsCount.value.count,
          },
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
            const { message } = await getResponseErrors(settingsResponse.error);
            return {
              message,
            };
          } else if (settingsResponse.error.response.status === 403) {
            const message = await get403Message(settingsResponse.error);
            return {
              message,
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
            const { message } = await getResponseErrors(emailResponse.error);
            return {
              message,
            };
          } else if (emailResponse.error.response.status === 403) {
            const message = await get403Message(emailResponse.error);
            return {
              message,
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
            const message = await get403Message(users.error);
            return {
              error: {
                message,
              },
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
  listDiagnosticLogs: () => {
    return {
      queryKey: ['listDiagnosticLogs'],
      queryFn: async () => {
        const getDiagnosticLogs = apiWrapper({
          fn: getDiagnosisApiClient().getDiagnosticLogs,
        });
        const response = await getDiagnosticLogs();

        if (!response.ok) {
          if (response.error.response.status === 403) {
            const message = await get403Message(response.error);
            return {
              message,
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
  productVersion: () => {
    return {
      queryKey: ['productVersion'],
      queryFn: async () => {
        const data = await fetch(`${window.location.origin}/product_version.txt`);
        const version = await data.text();
        return {
          version: version?.trim(),
        };
      },
    };
  },
  listAgentVersion: () => {
    return {
      queryKey: ['listAgentVersion'],
      queryFn: async () => {
        const api = apiWrapper({
          fn: getSettingsApiClient().getAgentVersions,
        });
        const response = await api();

        if (!response.ok) {
          if (response.error.response.status === 400) {
            const { message } = await getResponseErrors(response.error);
            return {
              message,
            };
          } else if (response.error.response.status === 403) {
            const message = await get403Message(response.error);
            return {
              message,
            };
          }
          throw response.error;
        }

        return {
          versions: response.value.versions || [],
          message: '',
        };
      },
    };
  },
  getThreatMapperLicense: () => {
    return {
      queryKey: ['getThreatMapperLicense'],
      queryFn: async () => {
        const api = apiWrapper({
          fn: getSettingsApiClient().getThreatMapperLicense,
        });
        const response = await api();

        if (!response.ok) {
          if (
            response.error.response.status === 403 ||
            response.error.response.status === 400
          ) {
            const message = await get403Message(response.error);
            return {
              message,
            };
          }
          throw response.error;
        }

        return response.value;
      },
    };
  },
});
