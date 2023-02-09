import React from 'react';
import { Typography } from 'ui-components';

const color_critical = '#ff4570';
const color_high = '#f90';
const color_medium = '#F8CD39';
const color_low = '#9CA3AF';
const color_total = '#1A56DB';

const RUNTIME_BOM_COUNTS = [
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
export const RuntimeBOMCount = () => {
  return (
    <div className="flex items-center justify-center mt-2 gap-6">
      <div className="px-4 flex items-center border-r border-gray-200 dark:border-gray-700 w-24 h-24">
        <span className="text-[2rem] text-gray-900 dark:text-gray-200 font-light">
          300
        </span>
      </div>
      <div className="flex gap-x-4">
        {RUNTIME_BOM_COUNTS.map((vuln) => {
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
