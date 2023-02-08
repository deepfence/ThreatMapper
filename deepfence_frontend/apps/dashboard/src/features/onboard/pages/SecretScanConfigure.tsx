import { useState } from 'react';
import {
  ActionFunctionArgs,
  Form,
  generatePath,
  Navigate,
  redirect,
  useActionData,
  useLocation,
} from 'react-router-dom';
import { Button } from 'ui-components';

import { getSecretApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelNodeIdentifierNodeTypeEnum,
} from '@/api/generated';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { OnboardConnectionNode } from '@/features/onboard/pages/connectors/MyConnectors';
import { ApiError, makeRequest } from '@/utils/api';
import { usePageNavigation } from '@/utils/usePageNavigation';

export type ScanActionReturnType = {
  message?: string;
};

const action = async ({ request }: ActionFunctionArgs): Promise<ScanActionReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  const nodeIds = body._nodeIds.toString().split(',');
  const nodeType = body._nodeType.toString();

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
          node_ids: nodeIds.map((nodeId) => ({
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
    generatePath('/onboard/scan/view-summary/running/:scanType/:bulkScanId', {
      scanType: 'secret',
      bulkScanId: r.bulk_scan_id,
    }),
    302,
  );
};

const SecretScanConfigure = () => {
  const { goBack } = usePageNavigation();
  const actionData = useActionData() as ScanActionReturnType;
  const location = useLocation();

  const [pageState] = useState<unknown>(location.state);
  if (!Array.isArray(pageState) || !pageState.length) {
    return <Navigate to="/onboard/connectors/my-connectors" />;
  }
  const state = pageState as OnboardConnectionNode[];

  return (
    <Form method="post">
      <input
        type="text"
        name="_nodeIds"
        hidden
        readOnly
        value={state.map((node) => node.urlId).join(',')}
      />
      <input type="text" name="_nodeType" readOnly hidden value={state[0].urlType} />
      <ConnectorHeader
        title="Configure Secret Scan"
        description="Just click the start scan button to start your secret scanning"
      />
      {actionData?.message && (
        <section className="mb-4">
          <p className={`text-sm text-red-500`}>{actionData.message}</p>
        </section>
      )}
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
