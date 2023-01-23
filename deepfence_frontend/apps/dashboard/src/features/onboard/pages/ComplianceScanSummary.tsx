import cx from 'classnames';
import { useState } from 'react';
import { Card, Separator, Typography } from 'ui-components';

import LogoAws from '@/assets/logo-aws.svg';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { ScanInProgress } from '@/features/onboard/components/scan-summary/ScanInProgress';
import { Link } from 'react-router-dom';

const color: { [key: string]: string } = {
  alarm: 'bg-red-400 dark:bg-red-500',
  info: 'bg-blue-400 dark:bg-blue-500',
  ok: 'bg-green-400 dark:bg-green-500',
  skip: 'bg-gray-400 dark:bg-gray-500',
};

type ScanType = {
  type: string;
  percentage: string;
  values: SeverityType[];
};
type SeverityType = {
  name: string;
  value: number;
};
type ScanDataType = {
  accountId: string;
  data: ScanType[];
};

const data: ScanDataType[] = [
  {
    accountId: 'AWS123456',
    data: [
      {
        percentage: '30%',
        type: 'CIS',
        values: [
          {
            name: 'Alarm',
            value: 50,
          },
          {
            name: 'Info',
            value: 20,
          },
          {
            name: 'Ok',
            value: 70,
          },
          {
            name: 'Skip',
            value: 10,
          },
        ],
      },
      {
        percentage: '30%',
        type: 'GDPR',
        values: [
          {
            name: 'Alarm',
            value: 50,
          },
          {
            name: 'Info',
            value: 20,
          },
          {
            name: 'Ok',
            value: 0,
          },
          {
            name: 'Skip',
            value: 0,
          },
        ],
      },
      {
        percentage: '30%',
        type: 'HIPPA',
        values: [
          {
            name: 'Alarm',
            value: 50,
          },
          {
            name: 'Info',
            value: 20,
          },
          {
            name: 'Ok',
            value: 70,
          },
          {
            name: 'Skip',
            value: 10,
          },
        ],
      },
    ],
  },
  {
    accountId: 'AWS1234567',
    data: [
      {
        percentage: '45%',
        type: 'CIS',
        values: [
          {
            name: 'Alarm',
            value: 50,
          },
          {
            name: 'Info',
            value: 40,
          },
          {
            name: 'Ok',
            value: 70,
          },
          {
            name: 'Skip',
            value: 400,
          },
        ],
      },
    ],
  },
];

const AccountComponent = ({ accountId }: { accountId: string }) => {
  return (
    <div
      className={cx(
        'h-full flex flex-col items-center justify-center gap-y-3',
        'border-r dark:border-gray-700',
        'bg-gray-100 dark:bg-gray-700',
      )}
    >
      <img src={LogoAws} alt="logo" height={40} width={40} />
      <data
        className={`${Typography.size.base} ${Typography.weight.normal} text-gray-700 dark:text-gray-300`}
      >
        {accountId}
      </data>
    </div>
  );
};

const TypeAndPercentageComponent = ({
  type,
  percentage,
}: {
  type: string;
  percentage: string;
}) => {
  return (
    <div
      className={cx(
        'flex w-full flex-col md:flex-row gap-x-0 gap-y-2',
        'items-center ml-0 lg:ml-[20%]',
      )}
    >
      <div className="flex flex-col gap-y-1 md:min-w-[100px] lg:min-w-[200px]">
        <data className={'text-2xl text-gray-700 dark:text-gray-300'}>{type}</data>
      </div>
      <div className="flex flex-col gap-y-1">
        <data className="text-sm text-gray-500 dark:text-gray-400">
          Overall Percentage
        </data>
        <data className={'text-2xl text-gray-700 dark:text-gray-300'}>{percentage}</data>
      </div>
    </div>
  );
};

const ChartComponent = ({ values }: { values: SeverityType[] }) => {
  const maxValue = Math.max(...values.map((v) => v.value));

  return (
    <div>
      {values.map(({ name, value }) => {
        return (
          <div className="flex items-center w-full" key={name}>
            <data
              className="pr-2 text-sm min-w-[60px] text-gray-500 text-end dark:text-gray-400"
              value={value}
            >
              {name}
            </data>
            <div
              className={cx(
                'w-[80%] overflow-hidden flex items-center',
                'cursor-pointer transition duration-100 hover:scale-y-125',
              )}
            >
              <div
                className={cx('rounded h-2 relative', color[name.toLowerCase()])}
                style={{
                  width: `${(100 / maxValue) * value}%`,
                }}
              ></div>
              <data className="ml-2 right-0 top-0 text-xs text-gray-500 dark:text-gray-400">
                {value}
              </data>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Scan = ({ scanData }: { scanData: ScanDataType }) => {
  const { accountId, data = [] } = scanData;

  return (
    <Card>
      <div className="grid grid-cols-[250px_1fr] items-center">
        <AccountComponent accountId={accountId} />
        <div className="flex flex-col">
          {data.map(({ type, values, percentage }: ScanType, index: number) => {
            return (
              <div key={type}>
                {index > 0 && index < data.length ? (
                  <Separator className="mx-6 h-[1px] bg-gray-100 dark:bg-gray-700" />
                ) : null}
                <div className="flex flex-col p-4">
                  <div className="grid grid-cols-[1fr_1fr]">
                    <TypeAndPercentageComponent type={type} percentage={percentage} />
                    <ChartComponent values={values} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export const ComplianceScanSummary = () => {
  const [scanData] = useState(data);
  const [scanning] = useState(false);

  const headerText = scanning ? 'Compliance Scan' : 'Compliance Scan Results Summary';

  const subHeaderText = scanning
    ? 'A scan has been initiated, soon you will see your scan result.'
    : 'Summary of compliance scan result';

  return (
    <div className="flex flex-col">
      <ConnectorHeader title={headerText} description={subHeaderText} />

      {scanning ? (
        <ScanInProgress text="Your Compliance Scan is currently running..." />
      ) : (
        <>
          <Link
            to="/"
            className={cx(
              `${Typography.size.sm} `,
              'underline underline-offset-2 ml-auto bg-transparent text-blue-600 dark:text-blue-500',
            )}
          >
            Go to Posture Dashboard to view details scan result
          </Link>

          <div className="flex flex-col gap-4 mt-4">
            {scanData.map((accountScanData: ScanDataType) => {
              return <Scan key={accountScanData.accountId} scanData={accountScanData} />;
            })}
          </div>
        </>
      )}
    </div>
  );
};
