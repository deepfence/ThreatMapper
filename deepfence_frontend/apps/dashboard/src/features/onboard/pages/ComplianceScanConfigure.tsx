import { filter, find } from 'lodash-es';
import { useEffect, useMemo, useState } from 'react';
import { HiMinusCircle, HiPlusCircle } from 'react-icons/hi';
import {
  ActionFunctionArgs,
  generatePath,
  LoaderFunctionArgs,
  Navigate,
  redirect,
  useActionData,
  useFetcher,
  useLocation,
  useNavigation,
  useSearchParams,
} from 'react-router-dom';
import {
  Button,
  createColumnHelper,
  Table,
  Tabs,
  Tooltip,
  Typography,
} from 'ui-components';

import { getComplianceApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelNodeIdentifierNodeTypeEnum,
} from '@/api/generated';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { OnboardConnectionNode } from '@/features/onboard/pages/connectors/MyConnectors';
import { ApiError, makeRequest } from '@/utils/api';
import { usePageNavigation } from '@/utils/usePageNavigation';

type ColumnType = {
  id: number;
  test_category: string;
  test_desc: string;
  status: string;
  is_enabled: boolean;
};

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
            cloud_account_scan_filter: { fields_values: null },
            kubernetes_cluster_scan_filter: { fields_values: null },
            container_scan_filter: { fields_values: null },
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

const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderDataType> => {
  return {};
};
const complianceTableData = [
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 1,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc:
      '4.1 Ensure a log metric filter and alarm exist for unauthorized API calls',
    test_number: 'control.cis_v140_4_1',
    status: 'Active',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 2,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc:
      '4.2 Ensure a log metric filter and alarm exist for Management Console sign-in without MFA',
    test_number: 'control.cis_v140_4_2',
    status: 'Active',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 3,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc:
      "4.3 Ensure a log metric filter and alarm exist for usage of 'root' account",
    test_number: 'control.cis_v140_4_3',
    status: 'Active',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 4,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc: '4.4 Ensure a log metric filter and alarm exist for IAM policy changes',
    test_number: 'control.cis_v140_4_4',
    status: 'Active',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 5,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc:
      '4.5 Ensure a log metric filter and alarm exist for CloudTrail configuration changes',
    test_number: 'control.cis_v140_4_5',
    status: 'Active',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 6,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc:
      '4.6 Ensure a log metric filter and alarm exist for AWS Management Console authentication failures',
    test_number: 'control.cis_v140_4_6',
    status: 'Active',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 7,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc:
      '4.7 Ensure a log metric filter and alarm exist for disabling or scheduled deletion of customer created CMKs',
    test_number: 'control.cis_v140_4_7',
    status: 'Active',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 8,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc:
      '4.8 Ensure a log metric filter and alarm exist for S3 bucket policy changes',
    test_number: 'control.cis_v140_4_8',
    status: 'Active',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 9,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc:
      '4.9 Ensure a log metric filter and alarm exist for AWS Config configuration changes',
    test_number: 'control.cis_v140_4_9',
    status: 'Active',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 10,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc:
      '4.10 Ensure a log metric filter and alarm exist for security group changes',
    test_number: 'control.cis_v140_4_10',
    status: 'Active',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 11,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc:
      '4.11 Ensure a log metric filter and alarm exist for changes to Network Access Control Lists (NACL)',
    test_number: 'control.cis_v140_4_11',
    status: 'Active',
  },
];

const ComplianceTable = () => {
  const columnHelper = createColumnHelper<ColumnType>();
  const [tableData] = useState(complianceTableData);

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        cell: (info) => info.getValue(),
        header: () => '#',
        maxSize: 20,
      }),
      columnHelper.accessor((row) => row.test_category, {
        id: 'category',
        cell: (info) => info.getValue(),
        header: () => <span>Category</span>,
        maxSize: 50,
      }),
      columnHelper.accessor('test_desc', {
        header: () => 'Description',
        cell: (info) => info.renderValue(),
        minSize: 500,
      }),
      columnHelper.accessor('status', {
        header: () => 'Status',
        cell: (info) => info.renderValue(),
        maxSize: 50,
      }),
    ],
    [],
  );
  return <Table size="sm" data={tableData} columns={columns} />;
};

type ComplianceType = 'aws' | 'gcp' | 'azure' | 'host' | 'kubernetes_cluster';

const complianceType: {
  [key in ComplianceType]: string[];
} = {
  aws: ['cis', 'nist', 'pci', 'hipaa', 'soc2', 'gdpr'],
  gcp: ['cis'],
  azure: ['cis', 'nist', 'hipaa'],
  host: ['hipaa', 'gdpr', 'pci', 'nist'],
  kubernetes_cluster: ['nsa-cisa'],
};

type TabsType = {
  label: string;
  value: string;
};

const hasTypeSelected = (prevTabs: TabsType[], value: string) => {
  return find(prevTabs, ['value', value]);
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
  const actionData = useActionData() as ScanActionReturnType;
  const [_, setSearchParams] = useSearchParams();
  const { goBack } = usePageNavigation();
  const [selectedTab, setSelectedTab] = useState('');
  const [tabs, setTabs] = useState<TabsType[] | []>([]);
  const fetcher = useFetcher();
  const navigation = useNavigation();

  const location = useLocation();
  const [pageState] = useState<unknown>(location.state);
  const state = pageState as OnboardConnectionNode[];
  const nodeType = state[0]?.urlType as ComplianceType;

  useEffect(() => {
    // set selected tab by last compliance type
    if (tabs.length > 0) {
      setSelectedTab(tabs[tabs.length - 1].value);
    } else {
      setSelectedTab('');
    }
  }, [tabs]);

  if (!Array.isArray(pageState) || !pageState.length) {
    return <Navigate to="/onboard/connectors/my-connectors" />;
  }

  const onScanTypeSelection = (name: string) => {
    setTabs((prevTabs) => {
      const found = hasTypeSelected(prevTabs, name);
      if (found) {
        const newType = filter(prevTabs, (tab: TabsType) => tab.value !== found.value);

        setSearchParams({
          controls: newType.map((type) => type.value).join(','),
        });
        return [...newType];
      } else {
        const newType = [
          ...prevTabs,
          {
            label: name,
            value: name,
          },
        ];
        setSearchParams({
          controls: newType.map((type) => type.value).join(','),
        });
        return newType;
      }
    });
  };

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
      <div className="mt-6 flex gap-4 mb-6">
        {complianceType[nodeType]?.map((type: string) => (
          <Button
            color="primary"
            outline={hasTypeSelected(tabs, type) ? false : true}
            size="xs"
            key={type}
            onClick={() => {
              onScanTypeSelection(type);
            }}
            endIcon={hasTypeSelected(tabs, type) ? <HiMinusCircle /> : <HiPlusCircle />}
            className="self-start"
            name={`${type}[]`}
            value={type}
          >
            {type.toUpperCase()}
          </Button>
        ))}
        <fetcher.Form method="post" className="self-start ml-auto">
          <input
            type="text"
            name="_nodeIds"
            hidden
            readOnly
            value={state.map((node) => node.urlId).join(',')}
          />
          <input type="text" name="_nodeType" readOnly hidden value={state[0].urlType} />
          <Button
            disabled={fetcher.state === 'submitting' || isStatusPageLoading}
            loading={fetcher.state === 'submitting' || isStatusPageLoading}
            size="sm"
            color="primary"
            className="ml-auto"
            type="submit"
          >
            Start Scan
          </Button>
        </fetcher.Form>
      </div>
      {actionData?.message && (
        <section className="mb-4">
          <p className={`text-sm text-red-500`}>{actionData.message}</p>
        </section>
      )}
      <div
        className={`${Typography.size.sm} ${Typography.weight.medium} mt-4 dark:text-white`}
      >
        {selectedTab === '' ? (
          <p>Please select at least one compliance type to start your scan.</p>
        ) : (
          <Tabs value={selectedTab} tabs={tabs} onValueChange={(v) => setSelectedTab(v)}>
            <div className="h-full p-2 dark:text-white">
              <ComplianceTable />
            </div>
          </Tabs>
        )}
      </div>

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
