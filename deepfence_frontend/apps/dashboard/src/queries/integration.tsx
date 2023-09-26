import { createQueryKeys } from '@lukemorales/query-key-factory';

import {
  getCommonApiClient,
  getIntegrationApiClient,
  getReportsApiClient,
} from '@/api/api';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';

export const integrationQueries = createQueryKeys('integration', {
  listIntegrations: () => {
    return {
      queryKey: ['listIntegrations'],
      queryFn: async () => {
        const listIntegrationApi = apiWrapper({
          fn: getIntegrationApiClient().listIntegration,
        });
        const integrationResponse = await listIntegrationApi();
        if (!integrationResponse.ok) {
          if (integrationResponse.error.response.status === 403) {
            const message = await get403Message(integrationResponse.error);
            return {
              message,
            };
          } else {
            return {
              message: 'Error in getting integrations',
            };
          }
        }

        return {
          data: integrationResponse.value,
        };
      },
    };
  },
  getReports: () => {
    return {
      queryKey: ['getReports'],
      queryFn: async () => {
        const listReportsApi = apiWrapper({
          fn: getReportsApiClient().listReports,
        });
        const reportsResponse = await listReportsApi();
        if (!reportsResponse.ok) {
          return {
            message: 'Error in getting reports',
          };
        }

        return {
          data: reportsResponse.value,
        };
      },
    };
  },
  getNotificationFields: () => {
    return {
      queryKey: ['getNotificationFields'],
      queryFn: async () => {
        const getReportFields = apiWrapper({
          fn: getCommonApiClient().getScanReportFields,
        });
        const reportFieldsResponse = await getReportFields();
        if (!reportFieldsResponse.ok) {
          throw reportFieldsResponse.error;
        }
        return reportFieldsResponse.value;
      },
    };
  },
});
