import { ActionFunctionArgs, useParams } from 'react-router-dom';
import { toast } from 'sonner';

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

export enum ActionEnumType {
  DELETE = 'delete',
  ADD = 'add',
}

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

type IntegrationType = keyof typeof IntegrationType;
const getConfigBodyNotificationType = (
  formData: FormData,
  integrationType: IntegrationType,
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
  params,
}: ActionFunctionArgs): Promise<{
  message?: string;
  deleteSuccess?: boolean;
} | null> => {
  const _integrationType = params.integrationType?.toString();
  const formData = await request.formData();
  const _notificationType = formData.get('_notificationType')?.toString();
  const _actionType = formData.get('_actionType')?.toString();

  if (!_actionType) {
    return {
      message: 'Action Type is required',
    };
  }

  if (_actionType === ActionEnumType.ADD) {
    if (!_integrationType) {
      return {
        message: 'Integration Type is required',
      };
    }
    if (!_notificationType) {
      return {
        message: 'Notification Type is required',
      };
    }
    const r = await makeRequest({
      apiFunction: getIntegrationApiClient().addIntegration,
      apiArgs: [
        {
          modelIntegrationAddReq: {
            integration_type: _integrationType,
            notification_type: _notificationType,
            config: getConfigBodyNotificationType(
              formData,
              _integrationType as IntegrationType,
            ),
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
    toast('Integration added successfully');
  } else if (_actionType === ActionEnumType.DELETE) {
    const id = formData.get('id')?.toString();
    if (!id) {
      return {
        deleteSuccess: false,
        message: 'An id is required to delete an integration',
      };
    }
    const r = await makeRequest({
      apiFunction: getIntegrationApiClient().deleteIntegration,
      apiArgs: [
        {
          integrationId: id,
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
    toast('Integration deleted successfully');
    return {
      deleteSuccess: true,
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
