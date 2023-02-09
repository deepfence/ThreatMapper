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
import { Button, Tooltip, Typography } from 'ui-components';

import { getSecretApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelNodeIdentifierNodeTypeEnum,
  ModelSecretScanTriggerReq,
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
  const nodeIds = formData.get('_nodeIds')?.toString().split(',') ?? [];
  const nodeType = formData.get('_nodeType')?.toString() ?? '';

  const requestBody: ModelSecretScanTriggerReq = {
    filters: {
      cloud_account_scan_filter: { fields_values: null },
      kubernetes_cluster_scan_filter: { fields_values: null },
      container_scan_filter: { fields_values: null },
      host_scan_filter: { fields_values: null },
      image_scan_filter: { fields_values: null },
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
    generatePath('/onboard/scan/view-summary/running/:nodeType/:scanType/:bulkScanId', {
      nodeType,
      scanType: 'secret',
      bulkScanId: r.bulk_scan_id,
    }),
    302,
  );
};

const SelectedAccountComponent = ({
  type,
  accounts,
}: {
  type: string;
  accounts: string[];
}) => {
  return (
    <span className={`${Typography.size.sm} text-gray-600 dark:text-gray-400`}>
      {accounts.length > 0 ? `${type} / ${accounts[0]}` : null}
      &nbsp;
      {accounts.length > 1 && (
        <Tooltip content={accounts.slice(1).join(', ')}>
          <span className={`${Typography.size.sm} text-blue-500 dark:text-blue-400`}>
            +{accounts.length - 1} more
          </span>
        </Tooltip>
      )}
    </span>
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
        endComponent={
          <SelectedAccountComponent
            accounts={state.map((node) => node.urlId)}
            type={state[0].urlType}
          />
        }
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
