import { useEffect, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Radio } from 'ui-components';

import { getSecretApiClient } from '@/api/api';
import {
  ModelNodeIdentifierNodeTypeEnum,
  ModelSecretScanTriggerReq,
} from '@/api/generated';
import { SecretScanNodeTypeEnum } from '@/types/common';
import { apiWrapper } from '@/utils/api';
import { isNodeTypeARegistryTagType, isNodeTypeARegistryType } from '@/utils/registry';

export type SecretScanConfigureFormProps = {
  showAdvancedOptions: boolean;
  data:
    | {
        nodeIds: string[];
        nodeType:
          | SecretScanNodeTypeEnum.host
          | SecretScanNodeTypeEnum.kubernetes_cluster
          | SecretScanNodeTypeEnum.registry
          | SecretScanNodeTypeEnum.container
          | SecretScanNodeTypeEnum.imageTag;
      }
    | {
        nodeIds: string[];
        images: string[];
        nodeType: SecretScanNodeTypeEnum.image;
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

export const scanSecretApiAction = async ({
  request,
}: ActionFunctionArgs): Promise<ScanActionReturnType | null> => {
  const formData = await request.formData();
  const nodeIds = formData.get('_nodeIds')?.toString().split(',') ?? [];
  const _images = formData.get('_images')?.toString().split(',') ?? [];
  const nodeType = formData.get('_nodeType')?.toString() ?? '';

  const imageTag = formData.get('imageTag')?.toString() ?? '';

  let filter_in = null;
  let _nodeType = nodeType;

  if (nodeType === SecretScanNodeTypeEnum.imageTag) {
    _nodeType = 'image';
  } else if (nodeType === SecretScanNodeTypeEnum.kubernetes_cluster) {
    _nodeType = 'cluster';
  } else if (nodeType === SecretScanNodeTypeEnum.image) {
    _nodeType = 'registry';
    if (imageTag !== '') {
      filter_in = {
        docker_image_name: _images,
        docker_image_tag: [imageTag],
      };
    } else {
      filter_in = {
        docker_image_name: _images,
      };
    }
  } else if (nodeType === SecretScanNodeTypeEnum.registry) {
    if (imageTag !== '') {
      filter_in = {
        docker_image_tag: [imageTag],
      };
    }
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
    node_ids: nodeIds.map((nodeId) => ({
      node_id: nodeId,
      node_type: _nodeType as ModelNodeIdentifierNodeTypeEnum,
    })),
  };
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
      return {
        success: false,
        message: startSecretScanResponse.error.message ?? '',
      };
    } else if (startSecretScanResponse.error.response.status === 403) {
      return {
        success: false,
        message: 'You do not have enough permissions to start scan',
      };
    }
    throw startSecretScanResponse.error;
  }

  toast('Scan has been sucessfully started');
  return {
    success: true,
    data: {
      bulkScanId: startSecretScanResponse.value.bulk_scan_id,
      nodeType,
    },
  };
};

export const SecretScanConfigureForm = ({
  data,
  onSuccess,
  onCancel,
  showAdvancedOptions: wantAdvanceOptions,
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

  return (
    <fetcher.Form
      className="flex flex-col min-w-[380px]"
      method="post"
      action="/data-component/scan/secret"
    >
      <input type="text" name="_nodeIds" hidden readOnly value={data.nodeIds.join(',')} />
      <input type="text" name="_nodeType" readOnly hidden value={data.nodeType} />
      {data.nodeType === SecretScanNodeTypeEnum.image && data.images && (
        <input type="text" name="_images" hidden readOnly value={data.images.join(',')} />
      )}
      {fetcherData?.message && (
        <p className="dark:text-status-error text-p7 pb-3">{fetcherData.message}</p>
      )}
      <div className="flex">
        {wantAdvanceOptions &&
          isNodeTypeARegistryType(data.nodeType) &&
          !isNodeTypeARegistryTagType(data.nodeType) && ( // remove isNodeTypeARegistryType when we have other advance options
            <h6 className={'text-md font-medium dark:text-white'}>Advanced Options</h6>
          )}
        {!wantAdvanceOptions && (
          <p className="text-gray-900 dark:text-text-text-and-icon text-p4 pr-3">
            You can start scanning to find secrets
          </p>
        )}
        {wantAdvanceOptions && isNodeTypeARegistryTagType(data.nodeType) && (
          <p className="text-gray-900 dark:text-text-text-and-icon text-p4 pr-3">
            You can start scanning to find secrets
          </p>
        )}
        {wantAdvanceOptions && !isNodeTypeARegistryType(data.nodeType) && (
          <p className="text-gray-900 dark:text-text-text-and-icon text-p4 pr-3">
            You can start scanning to find secrets
          </p>
        )}
      </div>
      {wantAdvanceOptions ? (
        <div className="flex flex-col gap-y-6">
          {isNodeTypeARegistryType(data.nodeType) &&
            !isNodeTypeARegistryTagType(data.nodeType) && (
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
      <div className="flex gap-3 mt-14">
        <Button disabled={state !== 'idle'} loading={state !== 'idle'} type="submit">
          Start Scan
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={() => onCancel?.()}>
            Cancel
          </Button>
        ) : null}
      </div>
    </fetcher.Form>
  );
};
