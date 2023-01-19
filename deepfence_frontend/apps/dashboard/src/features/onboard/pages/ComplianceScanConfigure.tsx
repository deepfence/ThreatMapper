import { filter, find, isEmpty } from 'lodash-es';
import { useEffect, useMemo, useState } from 'react';
import { HiBan, HiLightBulb, HiMinusCircle, HiPlusCircle } from 'react-icons/hi';
import {
  Button,
  createColumnHelper,
  getRowSelectionColumn,
  Switch,
  Table,
  Tabs,
  Tooltip,
  Typography,
} from 'ui-components';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { usePageNavigation } from '@/utils/usePageNavigation';

type ColumnType = {
  id: number;
  test_category: string;
  test_desc: string;
  status: string;
  is_enabled: boolean;
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
  const [tableData, setTableData] = useState(complianceTableData);

  const [rowSelectionState, setRowSelectionState] = useState<any>({});

  const onToggleChange = (rowData: any, flag: boolean) => {
    setTableData((data) => {
      data[rowData.row.index].is_enabled = flag;

      return [...data];
    });
  };
  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        maxSize: 10,
      }),
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
      columnHelper.accessor('is_enabled', {
        header: () => 'Enabled',
        cell: (info) => (
          <Switch
            checked={!!info.renderValue()}
            onCheckedChange={(e) => {
              onToggleChange(info, e);
            }}
          />
        ),
        maxSize: 50,
      }),
    ],
    [],
  );
  return (
    <div>
      <div className="py-2 text-gray-500">
        {isEmpty(rowSelectionState) ? (
          <span className="mb-3 block">No rows selected</span>
        ) : (
          <div className="flex gap-2">
            <Button size="xs" startIcon={<HiBan />}>
              Disable Selected
            </Button>
            <Button size="xs" startIcon={<HiLightBulb />}>
              Enable Selected
            </Button>
          </div>
        )}
      </div>
      <Table
        size="sm"
        data={tableData}
        columns={columns}
        enableRowSelection
        onRowSelectionChange={setRowSelectionState}
        rowSelectionState={rowSelectionState}
      />
    </div>
  );
};

const scanType = ['CIS', 'GDPR', 'HIPPA', 'PIC', 'SOC2', 'NIST'];

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
      {accounts.length > 0 ? `Account: ${type} / ${accounts[0]}` : null}
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

export const ComplianceScanConfigure = () => {
  const { goBack } = usePageNavigation();
  const [selectedTab, setSelectedTab] = useState('');
  const [tabs, setTabs] = useState<TabsType[] | []>([]);
  const { navigate } = usePageNavigation();

  const onScanTypeSelection = (name: string) => {
    setTabs((prevTabs) => {
      const found = hasTypeSelected(prevTabs, name);
      if (found) {
        return [...filter(prevTabs, (tab: TabsType) => tab.value !== found.value)];
      } else {
        return [
          ...prevTabs,
          {
            label: name,
            value: name,
          },
        ];
      }
    });
  };

  useEffect(() => {
    // set selected tab by last compliance type
    if (tabs.length > 0) {
      setSelectedTab(tabs[tabs.length - 1].value);
    } else {
      setSelectedTab('');
    }
  }, [tabs]);

  return (
    <>
      <ConnectorHeader
        title="Configure Compliance Scan"
        description="Choose from the below options to perform your first scan."
        endComponent={
          <SelectedAccountComponent
            accounts={[
              '234HTY6643',
              'dummy',
              'dummy',
              'dummy',
              'dummy',
              'dummy',
              'dummy',
              'dummy',
              'dummy',
            ]}
            type={'AWS'}
          />
        }
      />
      <div className="mt-6 flex gap-4 mb-6">
        {scanType.map((type) => (
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
          >
            {type}
          </Button>
        ))}
        <Button
          size="sm"
          color="primary"
          className="ml-auto"
          disabled={tabs.length === 0}
          onClick={() => navigate('/onboard/scan/view-summary')}
        >
          Start Scan
        </Button>
      </div>
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
    </>
  );
};
