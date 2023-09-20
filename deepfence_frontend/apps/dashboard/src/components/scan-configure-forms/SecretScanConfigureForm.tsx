import { useEffect, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Radio } from 'ui-components';

import { getSecretApiClient } from '@/api/api';
import {
  ModelNodeIdentifierNodeTypeEnum,
  ModelSecretScanTriggerReq,
  ReportersContainsFilter,
} from '@/api/generated';
import { invalidateAllQueries } from '@/queries';
import { SecretScanNodeTypeEnum } from '@/types/common';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { isNodeTypeARegistryTagType, isNodeTypeARegistryType } from '@/utils/registry';

export type SecretScanConfigureFormProps = {
  showAdvancedOptions: boolean;
  data: {
    nodes: {
      nodeId: string;
      nodeType:
        | SecretScanNodeTypeEnum.host
        | SecretScanNodeTypeEnum.kubernetes_cluster
        | SecretScanNodeTypeEnum.registry
        | SecretScanNodeTypeEnum.container
        | SecretScanNodeTypeEnum.imageTag
        | SecretScanNodeTypeEnum.image
        | SecretScanNodeTypeEnum.pod;
    }[];
    images?: string[]; // for registry image filter
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
  const nodeTypes = formData.get('_nodeTypes')?.toString().split(',') ?? [];

  const imageTag = formData.get('imageTag')?.toString() ?? '';

  const getNodeType = (nodeType: SecretScanNodeTypeEnum | 'container_image') => {
    let _nodeType = '';
    if (nodeType === SecretScanNodeTypeEnum.host) {
      _nodeType = SecretScanNodeTypeEnum.host;
    } else if (nodeType === SecretScanNodeTypeEnum.container) {
      _nodeType = SecretScanNodeTypeEnum.container;
    } else if (
      nodeType === SecretScanNodeTypeEnum.imageTag ||
      nodeType === 'container_image'
    ) {
      _nodeType = SecretScanNodeTypeEnum.image;
    } else if (nodeType === SecretScanNodeTypeEnum.kubernetes_cluster) {
      _nodeType = 'cluster';
    } else if (nodeType === SecretScanNodeTypeEnum.image) {
      _nodeType = 'registry';
    } else if (nodeType === SecretScanNodeTypeEnum.registry) {
      _nodeType = SecretScanNodeTypeEnum.registry;
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
    node_ids: nodeIds.map((nodeId, index) => ({
      node_id: nodeId,
      node_type: getNodeType(
        nodeTypes[index] as SecretScanNodeTypeEnum,
      ) as ModelNodeIdentifierNodeTypeEnum,
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
      const message = await get403Message(startSecretScanResponse.error);
      return {
        success: false,
        message,
      };
    }
    throw startSecretScanResponse.error;
  }

  toast.success('Scan started sucessfully');
  invalidateAllQueries();
  return {
    success: true,
    data: {
      bulkScanId: startSecretScanResponse.value.bulk_scan_id,
      nodeType, // for onboard page redirection
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
      {data.images && (
        <input type="text" name="_images" hidden readOnly value={data.images.join(',')} />
      )}

      <div className="flex">
        {wantAdvanceOptions &&
          isNodeTypeARegistryType(nodeType) &&
          !isNodeTypeARegistryTagType(nodeType) && ( // remove isNodeTypeARegistryType when we have other advance options
            <h6 className={'text-md font-medium dark:text-white'}>Advanced Options</h6>
          )}
        {!wantAdvanceOptions && (
          <p className="text-gray-900 dark:text-text-text-and-icon text-p4 pr-3">
            Click on start scan to find secrets
          </p>
        )}
        {wantAdvanceOptions && isNodeTypeARegistryTagType(nodeType) && (
          <p className="text-gray-900 dark:text-text-text-and-icon text-p4 pr-3">
            Click on start scan to find secrets
          </p>
        )}
        {wantAdvanceOptions && !isNodeTypeARegistryType(nodeType) && (
          <p className="text-gray-900 dark:text-text-text-and-icon text-p4 pr-3">
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

      {fetcherData?.message && (
        <p className="dark:text-status-error text-p7 mt-4">{fetcherData.message}</p>
      )}

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
