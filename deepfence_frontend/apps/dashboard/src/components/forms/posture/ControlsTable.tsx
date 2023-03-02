import { useMemo, useState } from 'react';
import { createColumnHelper, Table } from 'ui-components';

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

type ColumnType = {
  id: number;
  test_category: string;
  test_desc: string;
  status: string;
  is_enabled: boolean;
};

export const ControlsTable = () => {
  const columnHelper = createColumnHelper<ColumnType>();
  const [tableData] = useState(complianceTableData);

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        cell: (info) => info.getValue(),
        header: () => '#',
        maxSize: 40,
        size: 30,
        minSize: 30,
      }),
      columnHelper.accessor((row) => row.test_category, {
        id: 'category',
        cell: (info) => info.getValue(),
        header: () => <span>Category</span>,
        maxSize: 100,
        size: 90,
        minSize: 90,
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
