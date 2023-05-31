import {
  ActionFunctionArgs,
  generatePath,
  LoaderFunctionArgs,
  useFetcher,
} from 'react-router-dom';
import { toast } from 'sonner';

import { getControlsApiClient } from '@/api/api';
import { ModelCloudNodeControlReqCloudProviderEnum } from '@/api/generated';
import { ModelCloudNodeComplianceControl } from '@/api/generated/models/ModelCloudNodeComplianceControl';
import { apiWrapper } from '@/utils/api';

export enum ActionEnumType {
  START_SCAN = 'start_scan',
  DISABLE = 'disable',
  ENABLE = 'enable',
}

type ActionFunctionType =
  | ReturnType<typeof getControlsApiClient>['enableControl']
  | ReturnType<typeof getControlsApiClient>['disableControl'];

type LoaderDataType = { message: string; controls: ModelCloudNodeComplianceControl[] };

export const listControlsApiLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<LoaderDataType> => {
  const checkType = params.checkType;
  const nodeType = params.nodeType;

  if (!nodeType) {
    throw new Error('Node Type is required');
  }

  if (!checkType) {
    throw new Error('Check Type is required');
  }

  const listControlsApi = apiWrapper({
    fn: getControlsApiClient().listControls,
  });
  const result = await listControlsApi({
    modelCloudNodeControlReq: {
      cloud_provider: nodeType as ModelCloudNodeControlReqCloudProviderEnum,
      compliance_type: checkType,
      node_id: '',
    },
  });
  if (!result.ok) {
    if (result.error.response.status === 400) {
      return {
        message: result.error.message,
        controls: [],
      };
    }
    if (result.error.response.status === 403) {
      return {
        message: 'You do not have enough permissions to view controls',
        controls: [],
      };
    }
    throw result.error;
  }

  if (!result.value) {
    return {
      message: '',
      controls: [],
    };
  }

  return { controls: result.value.controls ?? [], message: '' };
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

    const controlsApi = apiWrapper({
      fn: apiFunction,
    });
    result = await controlsApi({
      modelCloudNodeEnableDisableReq: {
        control_ids: [controlId],
        node_id: nodeId,
      },
    });
    if (!result.ok) {
      if (result.error.response.status === 400 || result.error.response.status === 409) {
        toast.error(result.error.message);
      }
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
  message: string;
  load: (checkType: string, nodeType: string) => void;
} => {
  const fetcher = useFetcher<LoaderDataType>();

  return {
    status: fetcher.state,
    controls: fetcher.data?.controls ?? [],
    message: fetcher.data?.message ?? '',
    load: (checkType: string, nodeType: string) => {
      fetcher.load(
        generatePath('/data-component/list/controls/:nodeType/:checkType', {
          checkType,
          nodeType,
        }),
      );
    },
  };
};
