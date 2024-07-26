import { ActionFunctionArgs } from 'react-router-dom';
import { toast } from 'sonner';

import { getScanResultsApiClient } from '@/api/api';
import { ModelScanResultsMaskRequestMaskActionEnum } from '@/api/generated';
import { invalidateAllQueries, queries } from '@/queries';
import { queryClient } from '@/queries/client';
import { ScanTypeEnum } from '@/types/common';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';

export enum ActionEnumType {
  MASK = 'mask',
  UNMASK = 'unmask',
  DELETE = 'delete',
  DOWNLOAD = 'download',
  NOTIFY = 'notify',
  DELETE_SCAN = 'delete_scan',
}

export interface ActionData {
  action: ActionEnumType;
  success: boolean;
  message?: string;
}

export const action = async ({
  params: { scanId = '' },
  request,
}: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  const ids = (formData.getAll('nodeIds[]') ?? []) as string[];
  const actionType = formData.get('actionType');
  const _scanId = scanId;
  if (!_scanId) {
    throw new Error('Scan ID is required');
  }

  if (actionType === ActionEnumType.DELETE || actionType === ActionEnumType.NOTIFY) {
    const notifyIndividual = formData.get('notifyIndividual')?.toString();
    const apiFunction =
      actionType === ActionEnumType.DELETE
        ? getScanResultsApiClient().deleteScanResult
        : getScanResultsApiClient().notifyScanResult;
    const resultApi = apiWrapper({
      fn: apiFunction,
    });
    const integrationIds = formData.getAll('integrationIds[]') as Array<string>;
    const result = await resultApi({
      modelScanResultsActionRequest: {
        result_ids: [...ids],
        scan_id: _scanId,
        scan_type: ScanTypeEnum.CloudComplianceScan,
        notify_individual: notifyIndividual === 'on',
        integration_ids:
          actionType === ActionEnumType.NOTIFY
            ? integrationIds.map((id) => Number(id))
            : null,
      },
    });

    if (!result.ok) {
      if (result.error.response.status === 400 || result.error.response.status === 409) {
        const { message } = await getResponseErrors(result.error);
        return {
          action: actionType,
          success: false,
          message: message,
        };
      } else if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        if (actionType === ActionEnumType.DELETE) {
          return {
            action: actionType,
            success: false,
            message,
          };
        } else if (actionType === ActionEnumType.NOTIFY) {
          return {
            action: actionType,
            success: false,
            message,
          };
        }
      }
      throw result.error;
    }
    invalidateAllQueries();
    if (actionType === ActionEnumType.NOTIFY) {
      toast.success('Notified successfully');
    }
    return {
      action: actionType,
      success: true,
    };
  } else if (actionType === ActionEnumType.MASK || actionType === ActionEnumType.UNMASK) {
    const apiFunction =
      actionType === ActionEnumType.MASK
        ? getScanResultsApiClient().maskScanResult
        : getScanResultsApiClient().unmaskScanResult;
    const resultApi = apiWrapper({
      fn: apiFunction,
    });
    const result = await resultApi({
      modelScanResultsMaskRequest: {
        mask_action: ModelScanResultsMaskRequestMaskActionEnum.Global,
        result_ids: [...ids],
        scan_id: _scanId,
        scan_type: ScanTypeEnum.CloudComplianceScan,
      },
    });
    if (!result.ok) {
      if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        if (actionType === ActionEnumType.MASK) {
          toast.error(message);
          return {
            action: actionType,
            success: false,
            message,
          };
        } else if (actionType === ActionEnumType.UNMASK) {
          toast.error(message);
          return {
            action: actionType,
            success: false,
            message,
          };
        }
      }
      throw result.error;
    }
    invalidateAllQueries();
    if (actionType === ActionEnumType.MASK) {
      toast.success('Masked Successfully and disabled the Control');
    } else if (actionType === ActionEnumType.UNMASK) {
      toast.success('Unmasked successfully');
    }
    return {
      action: actionType,
      success: true,
    };
  } else if (actionType === ActionEnumType.DELETE_SCAN) {
    const deleteScan = apiWrapper({
      fn: getScanResultsApiClient().deleteScanResultsForScanID,
    });

    const result = await deleteScan({
      scanId: formData.get('scanId') as string,
      scanType: ScanTypeEnum.CloudComplianceScan,
    });

    if (!result.ok) {
      if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        return {
          action: actionType,
          message,
          success: false,
        };
      }
      throw result.error;
    }
    await queryClient.invalidateQueries({
      queryKey: queries.common.scanHistories._def,
    });
    return {
      action: actionType,
      success: true,
    };
  } else {
    throw new Error('Unknown action type.');
  }
};
