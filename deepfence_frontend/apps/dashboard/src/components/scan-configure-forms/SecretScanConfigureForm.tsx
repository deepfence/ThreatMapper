import { useEffect, useState } from 'react';
import { ActionFunctionArgs, generatePath, redirect, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Checkbox, Radio, TextInput } from 'ui-components';

import { getSecretApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelNodeIdentifierNodeTypeEnum,
  ModelSecretScanTriggerReq,
} from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';

type ScanConfigureFormProps = {
  data: {
    urlIds: string[];
    urlType: string;
  };
  onSuccess: () => void;
};

type ScanActionReturnType = {
  message?: string;
  success: boolean;
};

export const scanSecretApiAction = async ({
  request,
}: ActionFunctionArgs): Promise<ScanActionReturnType | null> => {
  const formData = await request.formData();
  const nodeIds = formData.get('_nodeIds')?.toString().split(',') ?? [];
  const nodeType = formData.get('_nodeType')?.toString() ?? '';

  const scanInterval = formData.get('scanInterval')?.toString() ?? '';
  const scanEveryday = formData.get('scanEveryday')?.toString() ?? '';
  const scanTag = formData.get('scanTag')?.toString() ?? '';
  const priorityScan = formData.get('priorityScan')?.toString() ?? '';

  const requestBody: ModelSecretScanTriggerReq = {
    filters: {
      cloud_account_scan_filter: { filter_in: null },
      kubernetes_cluster_scan_filter: { filter_in: null },
      container_scan_filter: { filter_in: null },
      host_scan_filter: { filter_in: null },
      image_scan_filter: { filter_in: null },
    },
    node_ids: nodeIds.map((nodeId) => ({
      node_id: nodeId,
      node_type: (nodeType === 'kubernetes_cluster'
        ? 'cluster'
        : nodeType) as ModelNodeIdentifierNodeTypeEnum,
    })),
  };

  const r = await makeRequest({
    apiFunction: getSecretApiClient().startSecretScan,
    apiArgs: [
      {
        modelSecretScanTriggerReq: requestBody,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ScanActionReturnType>({
        success: false,
      });
      if (r.status === 400 || r.status === 409) {
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
  if (request.url.includes('onboard')) {
    throw redirect(
      generatePath('/onboard/scan/view-summary/running/:nodeType/:scanType/:bulkScanId', {
        nodeType,
        scanType: 'secret',
        bulkScanId: r.bulk_scan_id,
      }),
      302,
    );
  }
  toast('Scan has been sucessfully started');
  return {
    success: true,
  };
};

export const SecretScanConfigureForm = ({ data, onSuccess }: ScanConfigureFormProps) => {
  const [priorityScan, setPriorityScan] = useState(false);
  const [autoCheckandScan, setAutoCheckandScan] = useState(false);
  const [scanTag, setScanTag] = useState('last');
  const fetcher = useFetcher<ScanActionReturnType>();

  const { state, data: fetcherData } = fetcher;

  useEffect(() => {
    if (fetcherData?.success) {
      onSuccess();
    }
  }, [fetcherData]);

  return (
    <fetcher.Form
      className="flex flex-col px-6 py-2 mb-4"
      method="post"
      action="/data-component/scan/secret"
    >
      <input type="text" name="_nodeIds" hidden readOnly value={data.urlIds.join(',')} />
      <input type="text" name="_nodeType" readOnly hidden value={data.urlType} />
      {fetcherData?.message && (
        <p className="text-red-500 text-md py-3">{fetcherData.message}</p>
      )}
      <div className="flex">
        <h6 className={'text-md font-medium dark:text-white'}>Advanced Options</h6>
        <Button
          disabled={state === 'loading'}
          loading={state === 'loading'}
          size="sm"
          color="primary"
          className="ml-auto"
          type="submit"
        >
          Start Scan
        </Button>
      </div>
      <div className="flex flex-col gap-y-6">
        <Checkbox
          name="priorityScan"
          label="Priority Scan"
          checked={priorityScan}
          onCheckedChange={(checked: boolean) => {
            setPriorityScan(checked);
          }}
        />
        <Radio
          name="scanTag"
          defaultChecked
          value={scanTag}
          options={[
            { label: 'Scan last pushed tag', value: 'recent' },
            { label: 'Scan by "latest" tag', value: 'last' },
            { label: 'Scan all image tags', value: 'all' },
          ]}
          onValueChange={(value) => {
            setScanTag(value);
          }}
        />
        <TextInput
          className="min-[200px] max-w-xs"
          label="Scan interval in days (optional)"
          type={'text'}
          sizing="sm"
          name="scanInterval"
          placeholder=""
        />
        <Checkbox
          name="scanEveryday"
          label="Check and scan for new images every day"
          checked={autoCheckandScan}
          onCheckedChange={(checked: boolean) => {
            setAutoCheckandScan(checked);
          }}
        />
      </div>
    </fetcher.Form>
  );
};
