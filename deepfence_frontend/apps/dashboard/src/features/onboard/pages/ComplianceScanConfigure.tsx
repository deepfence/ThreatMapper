import { filter, find, isEmpty } from 'lodash-es';
import { useEffect, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import { HiBan, HiLightBulb, HiMinusCircle, HiPlusCircle } from 'react-icons/hi';
import {
  Button,
  createColumnHelper,
  getRowSelectionColumn,
  Switch,
  Table,
  Tabs,
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
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 4,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc: '4.4 Ensure a log metric filter and alarm exist for IAM policy changes',
    test_number: 'control.cis_v140_4_4',
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
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 12,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc:
      '4.12 Ensure a log metric filter and alarm exist for changes to network gateways',
    test_number: 'control.cis_v140_4_12',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 13,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc: '4.13 Ensure a log metric filter and alarm exist for route table changes',
    test_number: 'control.cis_v140_4_13',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 14,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc: '4.14 Ensure a log metric filter and alarm exist for VPC changes',
    test_number: 'control.cis_v140_4_14',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 15,
    is_enabled: true,
    test_category: 'CloudWatch',
    test_desc:
      '4.15 Ensure a log metric filter and alarm exists for AWS Organizations changes',
    test_number: 'control.cis_v140_4_15',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 16,
    is_enabled: true,
    test_category: 'VPC',
    test_desc:
      '5.1 Ensure no Network ACLs allow ingress from 0.0.0.0/0 to remote server administration ports',
    test_number: 'control.cis_v140_5_1',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 17,
    is_enabled: true,
    test_category: 'VPC',
    test_desc:
      '5.2 Ensure no security groups allow ingress from 0.0.0.0/0 to remote server administration ports',
    test_number: 'control.cis_v140_5_2',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 18,
    is_enabled: true,
    test_category: 'VPC',
    test_desc: '5.3 Ensure the default security group of every VPC restricts all traffic',
    test_number: 'control.cis_v140_5_3',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 19,
    is_enabled: true,
    test_category: 'VPC',
    test_desc: '5.4 Ensure routing tables for VPC peering are \\"least access\\',
    test_number: 'control.cis_v140_5_4',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 20,
    is_enabled: true,
    test_category: 'CloudTrail',
    test_desc: '3.1 Ensure CloudTrail is enabled in all regions',
    test_number: 'control.cis_v140_3_1',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 21,
    is_enabled: true,
    test_category: 'CloudTrail',
    test_desc: '3.2 Ensure CloudTrail log file validation is enabled',
    test_number: 'control.cis_v140_3_2',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 22,
    is_enabled: true,
    test_category: 'CloudTrail',
    test_desc:
      '3.3 Ensure the S3 bucket used to store CloudTrail logs is not publicly accessible',
    test_number: 'control.cis_v140_3_3',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 23,
    is_enabled: true,
    test_category: 'CloudTrail',
    test_desc: '3.4 Ensure CloudTrail trails are integrated with CloudWatch Logs',
    test_number: 'control.cis_v140_3_4',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 24,
    is_enabled: true,
    test_category: 'Config',
    test_desc: '3.5 Ensure AWS Config is enabled in all regions',
    test_number: 'control.cis_v140_3_5',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 25,
    is_enabled: true,
    test_category: 'CloudTrail',
    test_desc:
      '3.6 Ensure S3 bucket access logging is enabled on the CloudTrail S3 bucket',
    test_number: 'control.cis_v140_3_6',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 26,
    is_enabled: true,
    test_category: 'CloudTrail',
    test_desc: '3.7 Ensure CloudTrail logs are encrypted at rest using KMS CMKs',
    test_number: 'control.cis_v140_3_7',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 27,
    is_enabled: true,
    test_category: 'KMS',
    test_desc: '3.8 Ensure rotation for customer created CMKs is enabled',
    test_number: 'control.cis_v140_3_8',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 28,
    is_enabled: true,
    test_category: 'VPC',
    test_desc: '3.9 Ensure VPC flow logging is enabled in all VPCs',
    test_number: 'control.cis_v140_3_9',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 29,
    is_enabled: true,
    test_category: 'S3',
    test_desc:
      '3.10 Ensure that Object-level logging for write events is enabled for S3 bucket',
    test_number: 'control.cis_v140_3_10',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 30,
    is_enabled: true,
    test_category: 'S3',
    test_desc:
      '3.11 Ensure that Object-level logging for read events is enabled for S3 bucket',
    test_number: 'control.cis_v140_3_11',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 31,
    is_enabled: true,
    test_category: 'IAM',
    test_desc: '1.1 Maintain current contact details',
    test_number: 'control.cis_v140_1_1',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 32,
    is_enabled: true,
    test_category: 'IAM',
    test_desc: '1.2 Ensure security contact information is registered',
    test_number: 'control.cis_v140_1_2',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 33,
    is_enabled: true,
    test_category: 'IAM',
    test_desc: '1.3 Ensure security questions are registered in the AWS account',
    test_number: 'control.cis_v140_1_3',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 34,
    is_enabled: true,
    test_category: 'IAM',
    test_desc: "1.4 Ensure no 'root' user account access key exists",
    test_number: 'control.cis_v140_1_4',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 35,
    is_enabled: true,
    test_category: 'IAM',
    test_desc: "1.5 Ensure MFA is enabled for the 'root' user account",
    test_number: 'control.cis_v140_1_5',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 36,
    is_enabled: true,
    test_category: 'IAM',
    test_desc: "1.6 Ensure hardware MFA is enabled for the 'root' user account",
    test_number: 'control.cis_v140_1_6',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 37,
    is_enabled: true,
    test_category: 'IAM',
    test_desc: "1.7 Eliminate use of the 'root' user for administrative and daily tasks",
    test_number: 'control.cis_v140_1_7',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 38,
    is_enabled: true,
    test_category: 'IAM',
    test_desc: '1.8 Ensure IAM password policy requires minimum length of 14 or greater',
    test_number: 'control.cis_v140_1_8',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 39,
    is_enabled: true,
    test_category: 'IAM',
    test_desc: '1.9 Ensure IAM password policy prevents password reuse',
    test_number: 'control.cis_v140_1_9',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 40,
    is_enabled: true,
    test_category: 'IAM',
    test_desc:
      '1.10 Ensure multi-factor authentication (MFA) is enabled for all IAM users that have a console password',
    test_number: 'control.cis_v140_1_10',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 41,
    is_enabled: true,
    test_category: 'IAM',
    test_desc:
      '1.11 Do not setup access keys during initial user setup for all IAM users that have a console password',
    test_number: 'control.cis_v140_1_11',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 42,
    is_enabled: true,
    test_category: 'IAM',
    test_desc: '1.12 Ensure credentials unused for 45 days or greater are disabled',
    test_number: 'control.cis_v140_1_12',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 43,
    is_enabled: true,
    test_category: 'IAM',
    test_desc:
      '1.13 Ensure there is only one active access key available for any single IAM user',
    test_number: 'control.cis_v140_1_13',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 44,
    is_enabled: true,
    test_category: 'IAM',
    test_desc: '1.14 Ensure access keys are rotated every 90 days or less',
    test_number: 'control.cis_v140_1_14',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 45,
    is_enabled: true,
    test_category: 'IAM',
    test_desc: '1.15 Ensure IAM Users Receive Permissions Only Through Groups',
    test_number: 'control.cis_v140_1_15',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 46,
    is_enabled: true,
    test_category: 'IAM',
    test_desc:
      '1.16 Ensure IAM policies that allow full \\"*:*\\" administrative privileges are not attached',
    test_number: 'control.cis_v140_1_16',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 47,
    is_enabled: true,
    test_category: 'IAM',
    test_desc:
      '1.17 Ensure a support role has been created to manage incidents with AWS Support',
    test_number: 'control.cis_v140_1_17',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 48,
    is_enabled: true,
    test_category: 'IAM',
    test_desc:
      '1.18 Ensure IAM instance roles are used for AWS resource access from instances',
    test_number: 'control.cis_v140_1_18',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 49,
    is_enabled: true,
    test_category: 'IAM',
    test_desc:
      '1.19 Ensure that all the expired SSL/TLS certificates stored in AWS IAM are removed',
    test_number: 'control.cis_v140_1_19',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 50,
    is_enabled: true,
    test_category: 'IAM',
    test_desc: '1.20 Ensure that IAM Access analyzer is enabled for all regions',
    test_number: 'control.cis_v140_1_20',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 51,
    is_enabled: true,
    test_category: 'IAM',
    test_desc:
      '1.21 Ensure IAM users are managed centrally via identity federation or AWS Organizations for multi-account environments',
    test_number: 'control.cis_v140_1_21',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 52,
    is_enabled: true,
    test_category: 'S3',
    test_desc: '2.1.1 Ensure all S3 buckets employ encryption-at-rest',
    test_number: 'control.cis_v140_2_1_1',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 53,
    is_enabled: true,
    test_category: 'S3',
    test_desc: '2.1.2 Ensure S3 Bucket Policy is set to deny HTTP requests',
    test_number: 'control.cis_v140_2_1_2',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 54,
    is_enabled: true,
    test_category: 'S3',
    test_desc: '2.1.3 Ensure MFA Delete is enabled on S3 buckets',
    test_number: 'control.cis_v140_2_1_3',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 55,
    is_enabled: true,
    test_category: 'S3',
    test_desc:
      '2.1.4 Ensure all data in Amazon S3 has been discovered, classified and secured when required',
    test_number: 'control.cis_v140_2_1_4',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 56,
    is_enabled: true,
    test_category: 'S3',
    test_desc:
      "2.1.5 Ensure that S3 Buckets are configured with 'Block public access (bucket settings)'",
    test_number: 'control.cis_v140_2_1_5',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 57,
    is_enabled: true,
    test_category: 'EBS',
    test_desc: '2.2.1 Ensure EBS volume encryption is enabled',
    test_number: 'control.cis_v140_2_2_1',
  },
  {
    cloud_provider: 'aws',
    compliance_check_type: 'cis',
    id: 58,
    is_enabled: true,
    test_category: 'RDS',
    test_desc: '2.3.1 Ensure that encryption is enabled for RDS Instances',
    test_number: 'control.cis_v140_2_3_1',
  },
];

const ComplianceTable = () => {
  const columnHelper = createColumnHelper<ColumnType>();
  const [tableData, setTableData] = useState(complianceTableData);

  const [rowSelectionState, setRowSelectionState] = useState<any>({});

  const updateTableData = (rowData: any, flag: boolean) => {
    console.log(flag, 'data is ', rowData);
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
        cell: (info) => 'Active',
        maxSize: 50,
      }),
      columnHelper.accessor('is_enabled', {
        header: () => 'Enabled',
        cell: (info) => (
          <Switch
            checked={!!info.renderValue()}
            onCheckedChange={(e) => {
              updateTableData(info, e);
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

export const ComplianceScanConfigure = () => {
  const { goBack } = usePageNavigation();
  const [selectedTab, setSelectedTab] = useState('');
  const [tabs, setTabs] = useState<TabsType[] | []>([]);

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
        metadata={{
          accountId: '234HTY6643',
          type: 'AWS',
        }}
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
          >
            {type}
          </Button>
        ))}
        <Button
          size="sm"
          color="primary"
          className="ml-auto"
          disabled={tabs.length === 0}
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
