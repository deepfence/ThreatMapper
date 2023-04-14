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
  data: ReturnType<typeof getIntegrations>;
};

export const CLOUD_TRAIL_ALERT = 'CloudTrail Alert';
export const USER_ACTIVITIES = 'User Activities';

export enum ActionEnumType {
  DELETE = 'delete',
  ADD = 'add',
}

const getIntegrations = async (): Promise<{
  message?: string;
  data?: ModelIntegrationListResp[];
}> => {
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
    data: integrationPromise,
  };
};

export const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
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
    case IntegrationType.s3:
      return {
        s3_bucket_name: formBody.name,
        aws_access_key: formBody.accessKey,
        aws_secret_key: formBody.secretKey,
        s3_folder_name: formBody.folder,
        aws_region: formBody.region,
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
  let _notificationType = formData.get('_notificationType')?.toString();
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

    if (_notificationType === 'CloudTrail Alert') {
      _notificationType = 'cloudtrial_alert';
    } else if (_notificationType === 'User Activities') {
      _notificationType = 'user_activities';
    } else {
      _notificationType = _notificationType.toLowerCase();
    }

    // filters
    const hostFilter = formData.getAll('hostFilter')?.toString();
    const imageFilter = formData.getAll('imageFilter')?.toString();
    const clusterFilter = formData.getAll('clusterFilter')?.toString();
    const statusFilter = formData.getAll('statusFilter')?.toString();
    const intervalFilter = formData.get('interval')?.toString();

    const _filters = {};

    if (hostFilter) {
      // TODO Add filters
    }
    if (imageFilter) {
      // TODO Add filters
    }
    if (clusterFilter) {
      // TODO Add filters
    }
    if (statusFilter) {
      // TODO Add filters
    }
    if (intervalFilter) {
      // TODO Add filters
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
            filters: {
              contains_filter: {
                filter_in: {},
              },
              match_filter: { filter_in: {} },
              order_filter: { order_fields: [] },
              compare_filter: null,
            },
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
      return r.value();
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
