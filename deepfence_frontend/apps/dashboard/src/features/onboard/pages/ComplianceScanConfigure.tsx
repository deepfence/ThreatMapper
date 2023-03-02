import { useState } from 'react';
import {
  ActionFunctionArgs,
  generatePath,
  Navigate,
  redirect,
  useActionData,
  useFetcher,
  useLocation,
  useNavigation,
} from 'react-router-dom';
import { Button, Tooltip, Typography } from 'ui-components';

import { getComplianceApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelNodeIdentifierNodeTypeEnum,
} from '@/api/generated';
import { ScanConfigureForm } from '@/components/forms/posture/ScanConfigureForm';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { OnboardConnectionNode } from '@/features/onboard/pages/connectors/MyConnectors';
import { ApiError, makeRequest } from '@/utils/api';
import { usePageNavigation } from '@/utils/usePageNavigation';

export type ScanActionReturnType = {
  message?: string;
};

const cloudAccount = ['aws', 'gcp', 'azure'];

const action = async ({ request }: ActionFunctionArgs): Promise<ScanActionReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);
  const nodeIds = body._nodeIds.toString().split(',');
  let nodeType = body._nodeType.toString();
  const controls = new URL(request.url).searchParams.get('controls');

  if (nodeType === 'kubernetes_cluster') {
    nodeType = 'cluster';
  } else if (cloudAccount.includes(nodeType)) {
    nodeType = 'cloud_account';
  }

  const r = await makeRequest({
    apiFunction: getComplianceApiClient().startComplianceScan,
    apiArgs: [
      {
        modelComplianceScanTriggerReq: {
          benchmark_types: controls ? controls.split(',') : [],
          filters: {
            cloud_account_scan_filter: { filter_in: null },
            kubernetes_cluster_scan_filter: { filter_in: null },
            container_scan_filter: { filter_in: null },
            host_scan_filter: { filter_in: null },
            image_scan_filter: { filter_in: null },
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
    generatePath('/onboard/scan/view-summary/running/:nodeType/:scanType/:bulkScanId', {
      nodeType,
      scanType: 'compliance',
      bulkScanId: r.bulk_scan_id,
    }),
    302,
  );
};

export type LoaderDataType = {
  error?: string;
  message?: string;
  data?: any;
};

const loader = async (): Promise<LoaderDataType> => {
  return {};
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

const ComplianceScanConfigure = () => {
  const fetcher = useFetcher();
  const actionData = useActionData() as ScanActionReturnType;

  const { goBack } = usePageNavigation();
  const navigation = useNavigation();

  const location = useLocation();
  const [pageState] = useState<unknown>(location.state);
  const state = pageState as OnboardConnectionNode[];

  if (!Array.isArray(pageState) || !pageState.length) {
    return <Navigate to="/onboard/connectors/my-connectors" />;
  }

  const isStatusPageLoading =
    navigation.location?.pathname.includes('/view-summary/running') &&
    navigation.state === 'loading';

  return (
    <div>
      <ConnectorHeader
        title="Configure Compliance Scan"
        description="Choose from the below options to perform your first scan."
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

      <ScanConfigureForm
        loading={!!(fetcher.state === 'submitting' || isStatusPageLoading)}
        data={{
          urlIds: state.map((node) => node.urlId),
          urlType: state[0].urlType,
        }}
      />

      <Button onClick={goBack} size="xs" className="mt-16">
        Go Back
      </Button>
    </div>
  );
};

export const module = {
  action,
  loader,
  element: <ComplianceScanConfigure />,
};
