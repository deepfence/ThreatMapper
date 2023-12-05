import { useEffect } from 'react';
import { ActionFunctionArgs, generatePath, useFetcher } from 'react-router-dom';
import { Button, Modal } from 'ui-components';

import {
  getComplianceApiClient,
  getMalwareApiClient,
  getSecretApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';

export enum ActionEnumType {
  STOP_SCAN = 'stop_scan',
}
interface IActionData {
  action: ActionEnumType;
  success: boolean;
  message?: string;
}

export const stopScanApiFunctionMap = {
  [ScanTypeEnum.VulnerabilityScan]: getVulnerabilityApiClient().stopVulnerabilityScan,
  [ScanTypeEnum.SecretScan]: getSecretApiClient().stopSecretScan,
  [ScanTypeEnum.MalwareScan]: getMalwareApiClient().stopMalwareScan,
  [ScanTypeEnum.ComplianceScan]: getComplianceApiClient().stopComplianceScan,
  [ScanTypeEnum.CloudComplianceScan]: getComplianceApiClient().stopComplianceScan,
};

export const actionStopScan = async ({
  params,
  request,
}: ActionFunctionArgs): Promise<{ success?: boolean; message?: string }> => {
  const scanType = params?.scanType?.toString() as ScanTypeEnum;
  const formData = await request.formData();
  const scanIds = formData.getAll('scanIds[]') as string[];

  if (!scanType || scanIds.length === 0) {
    console.error('Scan id and Scan Type are required for stoping scan');
    throw new Error('Scan id and Scan Type are required for stoping scan');
  }

  const stopScanApi = apiWrapper({
    fn: stopScanApiFunctionMap[scanType],
  });
  const result = await stopScanApi({
    modelStopScanRequest: {
      scan_ids: scanIds,
      scan_type: scanType,
    },
  });
  if (!result.ok) {
    if (result.error.response.status === 400 || result.error.response.status === 409) {
      const { message } = await getResponseErrors(result.error);
      return {
        success: false,
        message,
      };
    } else if (result.error.response.status === 403) {
      const message = await get403Message(result.error);
      return {
        success: false,
        message,
      };
    }
    throw result.error;
  }

  invalidateAllQueries();
  return {
    success: true,
  };
};

export const StopScanForm = ({
  open,
  scanIds,
  closeModal,
  scanType,
  onCancelScanSuccess,
}: {
  open: boolean;
  scanIds: string[];
  scanType: ScanTypeEnum;
  closeModal: React.Dispatch<React.SetStateAction<boolean>>;
  onCancelScanSuccess?: () => void;
}) => {
  const fetcher = useFetcher<IActionData>();

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      onCancelScanSuccess?.();
    }
  }, [fetcher]);

  return (
    <Modal
      size="s"
      open={open}
      onOpenChange={() => closeModal(false)}
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center dark:text-text-text-and-icon">
            <span className="h-6 w-6 shrink-0 dark:text-df-gray-500">
              <ErrorStandardLineIcon />
            </span>
            Cancel {scanIds.length > 1 ? 'scans' : 'scan'}
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
          <div className={'flex gap-x-4 justify-end'}>
            <Button
              size="md"
              onClick={() => closeModal(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="md"
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
              onClick={(e) => {
                e.preventDefault();
                const formData = new FormData();
                scanIds.forEach((scanId) => {
                  formData.append('scanIds[]', scanId);
                });
                fetcher.submit(formData, {
                  method: 'post',
                  action: generatePath('/data-component/scan/stop/:scanType', {
                    scanType,
                  }),
                });
              }}
            >
              Cancel now
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <div className="grid">
          <span>The selected scan will be cancelled.</span>
          <br />
          <span>Are you sure you want to cancel?</span>
          {fetcher.data?.message && (
            <p className="mt-2 text-p7 dark:text-status-error">{fetcher.data?.message}</p>
          )}
        </div>
      ) : (
        <SuccessModalContent text="Cancel scan requested" />
      )}
    </Modal>
  );
};
