import React from 'react';
import { Typography } from 'ui-components';

const color_critical = '#ff4570';
const color_high = '#f90';
const color_medium = '#F8CD39';
const color_low = '#0080ff';
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
          {RUNTIME_BOM_COUNTS.map((data) => {
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
