import { ActionFunctionArgs, Form, generatePath, redirect } from 'react-router-dom';
import { Button } from 'ui-components';

import { getSecretApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelNodeIdentifierNodeTypeEnum,
} from '@/api/generated';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { ApiError, makeRequest } from '@/utils/api';
import { usePageNavigation } from '@/utils/usePageNavigation';

export type ScanActionReturnType = {
  message?: string;
};

const action = async ({
  params = {
    nodeIds: '',
    nodeType: '',
    scanType: '',
  },
}: ActionFunctionArgs): Promise<ScanActionReturnType> => {
  const { nodeIds = '', nodeType = '' } = params;
  const nodeIdArray = nodeIds?.split(',');

  const r = await makeRequest({
    apiFunction: getSecretApiClient().startSecretScan,
    apiArgs: [
      {
        modelSecretScanTriggerReq: {
          filters: {
            container_scan_filter: {
              fields_values: null,
            },
            host_scan_filter: { fields_values: null },
            image_scan_filter: { fields_values: null },
          },
          node_ids: nodeIdArray.map((nodeId) => ({
            node_id: nodeId,
            node_type: nodeType as ModelNodeIdentifierNodeTypeEnum,
          })),
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ScanActionReturnType>({});
      if (r.status === 400 || r.status === 409) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }

  throw redirect(
    generatePath(
      '/onboard/scan/view-summary/running/:nodeIds/:nodeType/:scanType/:bulkScanId',
      {
        nodeIds,
        nodeType,
        scanType: 'secret',
        bulkScanId: r.bulk_scan_id,
      },
    ),
    302,
  );
};

const SecretScanConfigure = () => {
  const { goBack } = usePageNavigation();
  return (
    <Form method="post">
      <ConnectorHeader
        title="Configure Secret Scan"
        description="Just click the start scan button to start your secret scanning"
      />
      <section className="flex">
        <div></div>
        <Button size="sm" color="primary" className="ml-auto" type="submit">
          Start scan
        </Button>
      </section>

      <Button onClick={goBack} color="default" size="xs" className="mt-16">
        Go Back
      </Button>
    </Form>
  );
};

export const module = {
  action,
  element: <SecretScanConfigure />,
};
