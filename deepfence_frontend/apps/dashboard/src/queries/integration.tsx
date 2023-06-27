import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getIntegrationApiClient, getReportsApiClient } from '@/api/api';
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
            return {
              message: 'You do not have enough permissions to view integrations',
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
});
