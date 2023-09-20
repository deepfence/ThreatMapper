import { useEffect } from 'react';
import { ActionFunctionArgs, generatePath, useFetcher } from 'react-router-dom';
import { Button, Modal } from 'ui-components';

import {
  getComplianceApiClient,
  getMalwareApiClient,
  getSecretApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import { ModelNodeIdentifierNodeTypeEnum } from '@/api/generated';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries } from '@/queries';
import { ScanTypeEnum, VulnerabilityScanNodeTypeEnum } from '@/types/common';
import { get403Message } from '@/utils/403';
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
  const nodeIds = formData.getAll('nodeIds[]') as string[];
  const nodeTypes = formData.getAll('nodeTypes[]') as string[];

  if (!scanType || scanIds.length === 0) {
    console.error('Scan id and Scan Type are required for stoping scan');
    throw new Error('Scan id and Scan Type are required for stoping scan');
  }

  const stopScanApi = apiWrapper({
    fn: stopScanApiFunctionMap[scanType],
  });
  const result = await stopScanApi({
    modelStopScanRequest: {
      node_ids: nodeIds.map((nodeId, index) => {
        return {
          node_id: nodeId,
          node_type: getNodeType(
            nodeTypes[index] as VulnerabilityScanNodeTypeEnum,
          ) as ModelNodeIdentifierNodeTypeEnum,
        };
      }),
      scan_ids: scanIds,
      scan_type: scanType,
    },
  });
  if (!result.ok) {
    if (result.error.response.status === 400 || result.error.response.status === 409) {
      return {
        success: false,
        message: result.error.message ?? '',
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
const getNodeType = (nodeType: VulnerabilityScanNodeTypeEnum | 'container_image') => {
  let _nodeType = '';
  if (nodeType === VulnerabilityScanNodeTypeEnum.host) {
    _nodeType = VulnerabilityScanNodeTypeEnum.host;
  } else if (nodeType === VulnerabilityScanNodeTypeEnum.container) {
    _nodeType = VulnerabilityScanNodeTypeEnum.container;
  } else if (
    nodeType === VulnerabilityScanNodeTypeEnum.imageTag ||
    nodeType === 'container_image'
  ) {
    _nodeType = VulnerabilityScanNodeTypeEnum.image;
  } else if (nodeType === VulnerabilityScanNodeTypeEnum.kubernetes_cluster) {
    _nodeType = 'cluster';
  } else if (nodeType === VulnerabilityScanNodeTypeEnum.image) {
    _nodeType = 'registry';
  } else if (nodeType === VulnerabilityScanNodeTypeEnum.registry) {
    _nodeType = VulnerabilityScanNodeTypeEnum.registry;
  }
  return _nodeType;
};

export const StopScanForm = ({
  open,
  nodes,
  closeModal,
  scanType,
  onCancelScanSuccess,
}: {
  open: boolean;
  nodes: {
    nodeId: string;
    scanId: string;
    nodeType: string;
  }[];
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
            Cancel {nodes.length > 1 ? 'scans' : 'scan'}
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
                nodes.forEach((node) => {
                  formData.append('scanIds[]', node.scanId);
                  formData.append('nodeIds[]', node.nodeId);
                  formData.append('nodeTypes[]', node.nodeType);
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
