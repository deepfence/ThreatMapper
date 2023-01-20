import cx from 'classnames';
import { useState } from 'react';
import { Button } from 'ui-components';
import { Card, Separator, Typography } from 'ui-components';

import LogoAws from '@/assets/logo-aws.svg';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { useTheme } from '@/theme/ThemeContext';

const color: { [key: string]: string } = {
  alarm: '#84E1BC',
  info: '#A4CAFE',
  ok: '#CABFFD',
  skip: '#FACA15',
};

const colorDark: { [key: string]: string } = {
  alarm: '#057A55',
  info: '#1C64F2',
  ok: '#7E3AF2',
  skip: '#9F580A',
};

type ScanDataType = {
  type: string;
  percentage: string;
  values: ResultType[];
};
type ResultType = {
  name: string;
  value: number;
};
type ScanResultType = {
  accountId: string;
  data: ScanDataType[];
};

const data: ScanResultType[] = [
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

const AccountSection = ({ accountId }: { accountId: string }) => {
  return (
    <div className="border-r dark:border-gray-700 bg-gray-100 dark:bg-gray-700 h-full flex flex-col items-center justify-center gap-y-1">
      <img src={LogoAws} alt="logo" height={30} width={30} />
      <data
        className={`${Typography.size.base} ${Typography.weight.normal} text-gray-700 dark:text-gray-200`}
      >
        {accountId}
      </data>
    </div>
  );
};

const PercentAndTypSection = ({
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
        <data className={'text-2xl text-gray-700 font-semibold dark:text-gray-400'}>
          {type}
        </data>
      </div>
      <div className="flex flex-col gap-y-1">
        <data className="text-sm text-gray-500 dark:text-gray-400">
          Overall Percentage
        </data>
        <data className={'text-2xl text-gray-900 font-bold dark:text-white'}>
          {percentage}
        </data>
      </div>
    </div>
  );
};

const ChartSection = ({ values }: { values: ResultType[] }) => {
  const { mode } = useTheme();
  const sum = values.reduce((acc: number, scanObject: ResultType) => {
    acc = acc + scanObject.value;
    return acc;
  }, 0);
  return (
    <div className="">
      {values.map(({ name, value }) => {
        const barWidth = Math.ceil(value === 0 ? 0 : (value / sum) * 100);
        return (
          <div className="flex items-center w-full ml-0 lg:ml-10" key={name}>
            <span className="pr-4 text-sm min-w-[60px] text-gray-500 text-end dark:text-gray-400">
              {name}
            </span>
            <div
              className={cx(
                'w-full overflow-hidden flex items-center',
                'cursor-pointer transition duration-100 hover:scale-y-125',
              )}
            >
              <div
                className="rounded h-2 relative"
                style={{
                  backgroundColor:
                    mode === 'dark'
                      ? colorDark[name.toLowerCase()]
                      : color[name.toLowerCase()],
                  width: `${barWidth}%`,
                }}
              ></div>
              <div className="ml-2 right-0 top-0 text-xs text-gray-500 dark:text-gray-400">
                {value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const ComplianceScanResult = ({ scanData }: { scanData: ScanResultType }) => {
  const { accountId, data = [] } = scanData;

  return (
    <Card>
      <summary className="grid grid-cols-[250px_1fr] items-center">
        <AccountSection accountId={accountId} />
        <div className="flex flex-col">
          {data.map(({ type, values, percentage }: ScanDataType, index: number) => {
            return (
              <div key={type}>
                {index > 0 && index < data.length ? (
                  <Separator className="mx-12 h-[1px] bg-gray-100 dark:bg-gray-700" />
                ) : null}
                <div className="flex flex-col gap-3 p-3">
                  <div className="p-3 grid grid-cols-[1fr_1fr]">
                    <PercentAndTypSection type={type} percentage={percentage} />
                    <ChartSection values={values} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </summary>
    </Card>
  );
};

export const ComplianceScanSummary = () => {
  const [scanData] = useState(data);

  return (
    <div className="flex flex-col">
      <ConnectorHeader
        title="View Compliance Scan Summary Results"
        description="Following are few scan data for your scan"
      />
      <Button size="sm" color="primary" className="ml-auto">
        Go To Main Dashboard
      </Button>
      <div className="flex flex-col gap-4 mt-4">
        {scanData.map((accountScanData: ScanResultType) => {
          return (
            <ComplianceScanResult
              key={accountScanData.accountId}
              scanData={accountScanData}
            />
          );
        })}
      </div>
    </div>
  );
};
