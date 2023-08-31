import { preset } from 'tailwind-preset';
import { Card } from 'ui-components';

import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { ECOption, ReactECharts } from '@/components/ReactEcharts';
import { formatMemory, formatPercentage } from '@/utils/number';

function getChartOption(usage: number, max: number, type: 'cpu' | 'memory'): ECOption {
  return {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        center: ['50%', '60%'],
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max,
        splitNumber: 5,
        itemStyle: {
          color: preset.theme.extend.colors.accent.accent,
        },
        progress: {
          show: true,
          width: 15,
        },
        pointer: {
          show: false,
        },
        axisLine: {
          lineStyle: {
            width: 15,
          },
        },
        axisTick: {
          distance: -25,
          splitNumber: 5,
          length: 5,
          lineStyle: {
            width: 1,
            color: preset.theme.extend.colors.text['text-and-icon'],
          },
        },
        splitLine: {
          distance: -30,
          length: 10,
          lineStyle: {
            width: 2,
            color: preset.theme.extend.colors.text['text-and-icon'],
          },
        },
        axisLabel: {
          distance: -25,
          color: preset.theme.extend.colors.text['text-and-icon'],
          fontSize: 10,
          formatter: (value) => {
            if (type === 'cpu') return `${value}%`;
            return formatMemory(value);
          },
        },
        anchor: {
          show: false,
        },
        title: {
          show: false,
        },
        detail: {
          valueAnimation: false,
          width: '60%',
          lineHeight: 40,
          borderRadius: 8,
          offsetCenter: [0, '-15%'],
          fontSize: 20,
          fontWeight: 'bolder',
          formatter: (value) => {
            if (type === 'cpu') {
              return `${formatPercentage(value, {
                maximumFractionDigits: 1,
              })}`;
            }
            return formatMemory(value);
          },
          color: 'inherit',
        },
        data: [
          {
            value: usage,
          },
        ],
      },
    ],
  };
}

export const AvailabilityCharts = ({
  cpuUsage,
  cpuMax,
  memoryUsage,
  memoryMax,
}: {
  cpuUsage: number;
  cpuMax: number;
  memoryUsage: number;
  memoryMax: number;
}) => {
  return (
    <Card className="rounded-[5px]">
      <h5 className="text-h5 dark:text-text-input-value px-3 py-2.5 flex items-center">
        Availability
      </h5>
      <div className="grid grid-cols-2">
        <div className="flex flex-col justify-center">
          <div className="h-[220px]">
            {cpuMax ? (
              <ReactECharts
                theme="dark"
                option={getChartOption(cpuUsage, cpuMax, 'cpu')}
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full gap-2">
                <div className="h-6 w-6 shrink-0 dark:text-text-text-and-icon">
                  <ErrorStandardLineIcon />
                </div>
                <p className="dark:text-text-text-and-icon text-h3">Not available</p>
              </div>
            )}
          </div>
          <div className="text-p6 dark:text-text-input-value text-center mb-4 -mt-10">
            CPU
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="h-[220px]">
            {memoryMax ? (
              <ReactECharts
                theme="dark"
                option={getChartOption(memoryUsage, memoryMax, 'memory')}
              />
            ) : (
              <div className="flex items-center justify-center h-full w-full gap-2">
                <div className="h-6 w-6 shrink-0 dark:text-text-text-and-icon">
                  <ErrorStandardLineIcon />
                </div>
                <p className="dark:text-text-text-and-icon text-h3">Not available</p>
              </div>
            )}
          </div>
          <div className="text-p6 dark:text-text-input-value text-center mb-4 -mt-10">
            Memory
          </div>
        </div>
      </div>
    </Card>
  );
};
