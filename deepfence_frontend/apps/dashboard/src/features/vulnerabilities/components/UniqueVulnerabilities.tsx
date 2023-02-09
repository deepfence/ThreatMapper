import { Pie } from '@ant-design/plots';
import { Separator, Typography } from 'ui-components';

const data = [
  {
    type: 'Critical',
    value: 27,
  },
  {
    type: 'High',
    value: 25,
  },
  {
    type: 'Medium',
    value: 18,
  },
  {
    type: 'Low',
    value: 15,
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
  return (
    <div className="px-2">
      <Pie {...config} />
    </div>
  );
};

const color_critical = '#ff4570';
const color_high = '#f90';
const color_medium = '#F8CD39';
const color_low = '#9CA3AF';
const color_total = '#1A56DB';

const VULNERABLE_COUNTS = [
  {
    label: 'Critical',
    count: 1224,
    color: color_critical,
  },
  {
    label: 'High',
    count: 473,
    color: color_high,
  },
  {
    label: 'Medium',
    count: 562,
    color: color_medium,
  },
  {
    label: 'Low',
    count: 97,
    color: color_low,
  },
];

export const UniqueVulnerabilitiesCount = () => {
  return (
    <div className="flex items-center justify-center mt-2 gap-6">
      <div className="px-4 flex flex-col items-center justify-center border-r border-gray-200 dark:border-gray-700 w-24 h-24">
        <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
          300
        </span>
        <span className="self-start text-sm text-gray-400 dark:text-gray-500">Total</span>
      </div>
      <div className="ml-4 flex gap-x-4">
        {VULNERABLE_COUNTS.map((vuln) => {
          return (
            <div className="flex flex-col" key={vuln.label}>
              <div className="pr-4 flex items-center gap-x-2">
                <div
                  className="rounded-full w-2 h-2"
                  style={{
                    backgroundColor: vuln.color,
                  }}
                ></div>
                <span className="text-[1.5rem] text-gray-900 dark:text-gray-200 font-light">
                  {vuln.count}
                </span>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {vuln.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
