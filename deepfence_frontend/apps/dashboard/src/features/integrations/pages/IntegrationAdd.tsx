import { ActionFunctionArgs, useParams } from 'react-router-dom';

import { getIntegrationApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelIntegrationListResp } from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';

import { IntegrationForm, IntegrationType } from '../components/IntegrationForm';
import { IntegrationTable } from '../components/IntegrationTable';

type ActionReturnType = {
  message?: string;
  success: boolean;
};

type LoaderDataType = {
  message?: string;
  data?: ModelIntegrationListResp[];
};

const getIntegrations = async (): Promise<LoaderDataType> => {
  const integrationPromise = await makeRequest({
    apiFunction: getIntegrationApiClient().listIntegration,
    apiArgs: [],
  });

  if (ApiError.isApiError(integrationPromise)) {
    return {
      message: 'Error in getting integrations',
    };
  }

  return {
    data: integrationPromise.map((integration) => {
      return {
        ...integration,
        ...integration.config,
      };
    }),
  };
};

const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getIntegrations(),
  });
};

const getConfigBodyNotificationType = (
  formData: FormData,
  integrationType: keyof typeof IntegrationType,
) => {
  const formBody = Object.fromEntries(formData);

  switch (integrationType) {
    case IntegrationType.slack:
      return {
        webhook_url: formBody.url,
        channel: formBody.channelName,
      };

    default:
      break;
  }
};

const action = async ({
  request,
}: ActionFunctionArgs): Promise<{
  message?: string;
} | null> => {
  const formData = await request.formData();
  const integrationType = formData.get('integrationType') as keyof typeof IntegrationType;
  const notificationType = formData.get('notificationType')?.toString();

  if (!integrationType) {
    throw new Error('Integration Type is required');
  }
  if (!notificationType) {
    throw new Error('Notification Type is required');
  }

  const r = await makeRequest({
    apiFunction: getIntegrationApiClient().addIntegration,
    apiArgs: [
      {
        modelIntegrationAddReq: {
          integration_type: integrationType,
          notification_type: notificationType,
          config: getConfigBodyNotificationType(formData, integrationType),
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ActionReturnType>({
        success: false,
      });
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
          success: false,
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return {
      message: 'Error in adding integrations',
    };
  }
  return null;
};

const IntegrationAdd = () => {
  const { integrationType } = useParams() as {
    integrationType: string;
  };

  if (!integrationType) {
    throw new Error('Integration Type is required');
  }

  return (
    <div className="grid grid-cols-[310px_1fr] p-2 gap-x-2">
      <IntegrationForm integrationType={integrationType} />
      <IntegrationTable />
    </div>
  );
};

export const module = {
  element: <IntegrationAdd />,
  action,
  loader,
};
