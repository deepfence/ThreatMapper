import { useEffect, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Checkbox, Radio, Switch, Tooltip } from 'ui-components';

import { getSecretApiClient, getSettingsApiClient } from '@/api/api';
import {
  ModelNodeIdentifierNodeTypeEnum,
  ModelScanResultsActionRequestScanTypeEnum,
  ModelSecretScanTriggerReq,
  ReportersContainsFilter,
} from '@/api/generated';
import { InfoStandardIcon } from '@/components/icons/common/InfoStandard';
import { ScheduleScanForm } from '@/components/scan-configure-forms/ScheduleScanForm';
import { invalidateAllQueries } from '@/queries';
import { SecretScanNodeTypeEnum } from '@/types/common';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { isNodeTypeARegistryTagType, isNodeTypeARegistryType } from '@/utils/registry';

export type SecretScanConfigureFormProps = {
  showAdvancedOptions: boolean;
  showScheduleScanOptions: boolean;
  data:
    | {
        nodes: {
          nodeId: string;
          nodeType:
            | SecretScanNodeTypeEnum.host
            | SecretScanNodeTypeEnum.kubernetes_cluster
            | SecretScanNodeTypeEnum.registry
            | SecretScanNodeTypeEnum.container
            | SecretScanNodeTypeEnum.imageTag
            | SecretScanNodeTypeEnum.pod;
        }[];
      }
    | {
        nodes: {
          nodeId: string;
          nodeType: SecretScanNodeTypeEnum.image;
        }[];
        images: string[];
      };
  onSuccess: (data?: { nodeType: string; bulkScanId: string }) => void;
  onCancel?: () => void;
};

type ScanActionReturnType = {
  message?: string;
  success: boolean;
  data?: {
    nodeType: string;
    bulkScanId: string;
  };
};
const shouldSetPriorityScan = (nodeType: SecretScanNodeTypeEnum) =>
  nodeType !== SecretScanNodeTypeEnum.kubernetes_cluster;

export const scanSecretApiAction = async ({
  request,
}: ActionFunctionArgs): Promise<ScanActionReturnType | null> => {
  const formData = await request.formData();
  const nodeIds = formData.get('_nodeIds')?.toString().split(',') ?? [];
  const _images = formData.get('_images')?.toString().split(',') ?? [];
  const nodeTypes = formData.get('_nodeTypes')?.toString().split(',') ?? [];

  const imageTag = formData.get('imageTag')?.toString() ?? '';

  const scheduleOn = formData.get('scheduleOn') === 'on';
  const scanImmediately = formData.get('scanImmediately') === 'on';
  const scheduleDescription = formData.get('scheduleDescription');
  const scheduleCron = `0 ${formData.get('scheduleCron')}`;

  const isPriorityScan = formData.get('isPriorityScan') === 'on';
  const scanDeepfenceSystem = formData.get('scanDeepfenceSystem') === 'on';

  const getNodeType = (nodeType: SecretScanNodeTypeEnum | 'container_image') => {
    let _nodeType = nodeType as ModelNodeIdentifierNodeTypeEnum;
    if (nodeType === SecretScanNodeTypeEnum.imageTag || nodeType === 'container_image') {
      _nodeType = SecretScanNodeTypeEnum.image;
    } else if (nodeType === SecretScanNodeTypeEnum.kubernetes_cluster) {
      _nodeType = 'cluster';
    } else if (nodeType === SecretScanNodeTypeEnum.image) {
      _nodeType = 'registry';
    }
    return _nodeType;
  };

  const createFilter = (
    nodeType: SecretScanNodeTypeEnum,
  ): ReportersContainsFilter['filter_in'] => {
    if (nodeType === SecretScanNodeTypeEnum.image) {
      if (imageTag !== '') {
        return {
          docker_image_name: _images,
          docker_image_tag: [imageTag],
        };
      } else {
        return {
          docker_image_name: _images,
        };
      }
    } else if (nodeType === SecretScanNodeTypeEnum.registry) {
      if (imageTag !== '') {
        return {
          docker_image_tag: [imageTag],
        };
      }
    }
    return null;
  };

  const nodeType = nodeTypes[0];
  let filter_in = null;
  if (
    nodeType === SecretScanNodeTypeEnum.image ||
    nodeType === SecretScanNodeTypeEnum.registry
  ) {
    filter_in = createFilter(nodeType);
  }

  const requestBody: ModelSecretScanTriggerReq = {
    filters: {
      cloud_account_scan_filter: { filter_in: null },
      kubernetes_cluster_scan_filter: { filter_in: null },
      container_scan_filter: { filter_in: null },
      host_scan_filter: { filter_in: null },
      image_scan_filter: {
        filter_in,
      },
    },
    is_priority: isPriorityScan,
    node_ids: nodeIds.map((nodeId, index) => ({
      node_id: nodeId,
      node_type: getNodeType(
        nodeTypes[index] as SecretScanNodeTypeEnum,
      ) as ModelNodeIdentifierNodeTypeEnum,
    })),
    deepfence_system_scan: scanDeepfenceSystem,
  };

  let scanResponse = {
    success: true,
    data: {
      bulkScanId: '',
      nodeType,
    },
  };
  if (!scheduleOn || scanImmediately) {
    const startSecretScanApi = apiWrapper({
      fn: getSecretApiClient().startSecretScan,
    });

    const startSecretScanResponse = await startSecretScanApi({
      modelSecretScanTriggerReq: requestBody,
    });
    if (!startSecretScanResponse.ok) {
      if (
        startSecretScanResponse.error.response.status === 400 ||
        startSecretScanResponse.error.response.status === 409
      ) {
        const { message } = await getResponseErrors(startSecretScanResponse.error);
        return {
          success: false,
          message,
        };
      } else if (startSecretScanResponse.error.response.status === 403) {
        const message = await get403Message(startSecretScanResponse.error);
        return {
          success: false,
          message,
        };
      } else if (startSecretScanResponse.error.response.status >= 500) {
        console.error(startSecretScanResponse.error);
        return {
          success: false,
          message: 'Something went wrong, please try again later.',
        };
      }
      throw startSecretScanResponse.error;
    }
    scanResponse = {
      success: true,
      data: {
        bulkScanId: startSecretScanResponse.value.bulk_scan_id,
        nodeType, // for onboard page redirection
      },
    };
  }
  if (scheduleOn) {
    const addScheduledTaskApi = apiWrapper({
      fn: getSettingsApiClient().addScheduledTask,
    });
    const scheduleResponse = await addScheduledTaskApi({
      modelAddScheduledTaskRequest: {
        ...requestBody,
        benchmark_types: null,
        scan_config: null,
        action: ModelScanResultsActionRequestScanTypeEnum.SecretScan,
        cron_expr: scheduleCron,
        description: scheduleDescription?.toString(),
      },
    });
    if (!scheduleResponse.ok) {
      if (
        scheduleResponse.error.response.status === 400 ||
        scheduleResponse.error.response.status === 409
      ) {
        const { message } = await getResponseErrors(scheduleResponse.error);
        return {
          success: false,
          message,
        };
      } else if (scheduleResponse.error.response.status === 403) {
        const message = await get403Message(scheduleResponse.error);
        return {
          success: false,
          message,
        };
      }
      throw scheduleResponse.error;
    }
  }

  // schedule scan
  if (scheduleOn && scanImmediately) {
    toast.success('Scan started and scheduled successfully');
  } else if (scheduleOn) {
    toast.success('Scan scheduled successfully');
  } else {
    toast.success('Scan started successfully');
  }

  invalidateAllQueries();
  return scanResponse;
};

const ScanDeepfenceSystem = () => {
  return (
    <div className="mt-6 flex items-center gap-x-1">
      <Switch
        label="Scan selected Deepfence images/containers"
        name="scanDeepfenceSystem"
      />
      <Tooltip
        content="If the resources you have selected for the scan include Deepfence images/containers, you can enable this option to scan them. Deepfence images/containers are not scanned by default."
        triggerAsChild
      >
        <span className="w-4 h-4">
          <InfoStandardIcon />
        </span>
      </Tooltip>
    </div>
  );
};

const wantDeepfenceSystem = ({
  nodes,
}: {
  nodes: {
    nodeType: SecretScanNodeTypeEnum;
  }[];
}) => {
  return nodes.find(({ nodeType }) => {
    return (
      nodeType === SecretScanNodeTypeEnum.registry ||
      nodeType === SecretScanNodeTypeEnum.imageTag ||
      nodeType === SecretScanNodeTypeEnum.container ||
      nodeType === SecretScanNodeTypeEnum.image ||
      nodeType === SecretScanNodeTypeEnum.pod ||
      nodeType === SecretScanNodeTypeEnum.kubernetes_cluster ||
      nodeType === ('container_image' as SecretScanNodeTypeEnum)
    );
  });
};

export const SecretScanConfigureForm = ({
  data,
  onSuccess,
  onCancel,
  showAdvancedOptions: wantAdvanceOptions,
  showScheduleScanOptions,
}: SecretScanConfigureFormProps) => {
  const [imageTag, setImageTag] = useState('latest');
  const fetcher = useFetcher<ScanActionReturnType>();

  const { state, data: fetcherData } = fetcher;

  useEffect(() => {
    let data = undefined;
    if (fetcherData?.success && state === 'idle') {
      if (fetcher.data) {
        data = fetcher.data.data;
      }
      onSuccess(data);
    }
  }, [fetcherData, state]);

  // in case of registry scan nodeType will be always be of same type
  const nodeType = data.nodes[0].nodeType;

  return (
    <fetcher.Form
      className="flex flex-col min-w-[380px]"
      method="post"
      action="/data-component/scan/secret"
    >
      <input
        type="text"
        name="_nodeIds"
        hidden
        readOnly
        value={data.nodes.map((node) => node.nodeId).join(',')}
      />
      <input
        type="text"
        name="_nodeTypes"
        readOnly
        hidden
        value={data.nodes.map((node) => node.nodeType).join(',')}
      />
      {'images' in data && (
        <input type="text" name="_images" hidden readOnly value={data.images.join(',')} />
      )}

      <div className="flex">
        {wantAdvanceOptions &&
          isNodeTypeARegistryType(nodeType) &&
          !isNodeTypeARegistryTagType(nodeType) && ( // remove isNodeTypeARegistryType when we have other advance options
            <h6 className={'text-md font-medium dark:text-white'}>Advanced Options</h6>
          )}
        {!wantAdvanceOptions && (
          <p className="text-text-text-and-icon text-p4 pr-3">
            Click on start scan to find secrets
          </p>
        )}
        {wantAdvanceOptions && isNodeTypeARegistryTagType(nodeType) && (
          <p className="text-text-text-and-icon text-p4 pr-3">
            Click on start scan to find secrets
          </p>
        )}
        {wantAdvanceOptions && !isNodeTypeARegistryType(nodeType) && (
          <p className="text-text-text-and-icon text-p4 pr-3">
            Click on start scan to find secrets
          </p>
        )}
      </div>
      {wantAdvanceOptions ? (
        <div className="flex flex-col gap-y-6">
          {isNodeTypeARegistryType(nodeType) && !isNodeTypeARegistryTagType(nodeType) && (
            <Radio
              name="imageTag"
              value={imageTag}
              options={[
                { label: 'Scan last pushed tag', value: 'recent' },
                { label: 'Scan by "latest" tag', value: 'latest' },
                { label: 'Scan all image tags', value: 'all' },
              ]}
              onValueChange={(value) => {
                setImageTag(value);
              }}
            />
          )}
        </div>
      ) : null}

      {shouldSetPriorityScan(nodeType as SecretScanNodeTypeEnum) ? (
        <div className="flex flex-col gap-y-2 mt-4">
          <h6 className={'text-p3 text-text-text-and-icon'}>Priority scan</h6>
          <Checkbox name="isPriorityScan" label="Priority scan" />
        </div>
      ) : null}

      {showScheduleScanOptions && <ScheduleScanForm />}

      {wantDeepfenceSystem(data) ? <ScanDeepfenceSystem /> : null}

      {fetcherData?.message && (
        <p className="text-status-error text-p7 mt-4" data-testid="errorMessage">
          {fetcherData.message}
        </p>
      )}

      <div className="flex gap-3 mt-14">
        <Button
          disabled={state !== 'idle'}
          loading={state !== 'idle'}
          type="submit"
          data-testid="startScanButton"
        >
          Start Scan
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => onCancel?.()}
            data-testid="cancelButton"
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </fetcher.Form>
  );
};
