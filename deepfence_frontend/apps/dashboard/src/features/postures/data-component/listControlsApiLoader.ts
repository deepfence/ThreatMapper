import {
  ActionFunctionArgs,
  generatePath,
  LoaderFunctionArgs,
  useFetcher,
} from 'react-router-dom';
import { toast } from 'sonner';

import { getControlsApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ModelCloudNodeComplianceControl } from '@/api/generated/models/ModelCloudNodeComplianceControl';
import { ApiError, makeRequest } from '@/utils/api';

export enum ActionEnumType {
  START_SCAN = 'start_scan',
  DISABLE = 'disable',
  ENABLE = 'enable',
}

type ActionFunctionType =
  | ReturnType<typeof getControlsApiClient>['enableControl']
  | ReturnType<typeof getControlsApiClient>['disableControl'];

export const listControlsApiLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<ModelCloudNodeComplianceControl[]> => {
  const checkType = params.checkType;

  if (!checkType) {
    throw new Error('Check Type is required');
  }

  const result = await makeRequest({
    apiFunction: getControlsApiClient().listControls,
    apiArgs: [
      {
        modelCloudNodeControlReq: {
          cloud_provider: 'aws',
          compliance_type: checkType,
          node_id: '',
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<{
        message?: string;
      }>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }

  if (!result) {
    return [];
  }

  return result.controls ?? [];
};

export const toggleControlApiAction = async ({
  request,
}: ActionFunctionArgs): Promise<null> => {
  const formData = await request.formData();
  const nodeId = formData.get('nodeId')?.toString();
  const actionType = formData.get('actionType')?.toString();
  const controlId = formData.get('controlId')?.toString() ?? '';
  let result = null;
  let apiFunction: ActionFunctionType;
  if (actionType === ActionEnumType.ENABLE || actionType === ActionEnumType.DISABLE) {
    apiFunction =
      actionType === ActionEnumType.ENABLE
        ? getControlsApiClient().enableControl
        : getControlsApiClient().disableControl;

    result = await makeRequest({
      apiFunction: apiFunction,
      apiArgs: [
        {
          modelCloudNodeEnableDisableReq: {
            control_ids: [controlId],
            node_id: nodeId,
          },
        },
      ],
      errorHandler: async (r) => {
        const error = new ApiError<{
          message?: string;
        }>({});
        if (r.status === 400 || r.status === 409) {
          const modelResponse: ApiDocsBadRequestResponse = await r.json();
          return error.set({
            message: modelResponse.message ?? '',
          });
        }
      },
    });
  }

  if (ApiError.isApiError(result)) {
    if (result.value()?.message !== undefined) {
      const message = result.value()?.message ?? 'Something went wrong';
      toast.error(message);
    }
  }

  toast.success(
    `${actionType === ActionEnumType.DISABLE ? 'Disabled' : 'Enabled'}  successfully`,
  );
  return null;
};

export const useGetControlsList = (): {
  status: 'idle' | 'loading' | 'submitting';
  controls: ModelCloudNodeComplianceControl[];
  load: (checkType: string) => void;
} => {
  const fetcher = useFetcher<ModelCloudNodeComplianceControl[]>();

  return {
    status: fetcher.state,
    controls: fetcher.data ?? [],
    load: (checkType: string) => {
      fetcher.load(
        generatePath('/data-component/list/controls/:checkType', {
          checkType,
        }),
      );
    },
  };
};
