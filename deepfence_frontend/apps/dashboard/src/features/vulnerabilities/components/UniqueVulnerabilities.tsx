import { Pie } from '@ant-design/charts';
import { Separator, Typography } from 'ui-components';

const data = [
  {
    type: '分类一',
    value: 27,
  },
  {
    type: '分类二',
    value: 25,
  },
  {
    type: '分类三',
    value: 18,
  },
  {
    type: '分类四',
    value: 15,
  },
  {
    type: '分类五',
    value: 10,
  },
  {
    type: '其他',
    value: 5,
  },
];
const config = {
  width: 140,
  height: 140,
  legend: false,
  appendPadding: 10,
  data,
  angleField: 'value',
  colorField: 'type',
  radius: 1,
  innerRadius: 0.7,
  label: {
    type: 'inner',
    offset: '-50%',
    content: '{value}',
    style: {
      textAlign: 'center',
      fontSize: 14,
    },
  },
  interactions: [
    {
      type: 'element-selected',
    },
    {
      type: 'element-active',
    },
  ],
  statistic: {
    title: false,
    content: false,
  },
};

export const UniqueVulnerabilities = () => {
  return <Pie {...config} />;
};

const color_critical = '#ff4570';
const color_high = '#f90';
const color_medium = '#F8CD39';
const color_low = '#0080ff';
const color_total = '#1A56DB';

const VULNERABLE_COUNTS = [
  {
    label: 'Critical',
    count: 183,
    color: color_critical,
  },
  {
    label: 'High',
    count: 371,
    color: color_high,
  },
  {
    label: 'Medium',
    count: 290,
    color: color_medium,
  },
  {
    label: 'Low',
    count: 53,
    color: color_low,
  },
];

export const UniqueVulnerabilitiesCount = () => {
  return (
    <>
      <div className="pl-4 flex flex-col items-start h-full dark:text-white">
        <div className="flex flex-col justify-center">
          <div className="pr-4 flex items-center gap-x-2">
            <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
              300
            </span>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">Total Accounts</span>
        </div>
        <div className={`flex gap-4 my-4`}>
          {VULNERABLE_COUNTS.map((data) => {
            return (
              <div
                key={data.count}
                className={`flex flex-col ${Typography.weight.medium} pr-8 font-light`}
              >
                <span className={`${Typography.size.lg}`}>{data.count}</span>
                <span
                  className={`${Typography.size.xs}`}
                  style={{
                    color: data.color,
                  }}
                >
                  {data.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
