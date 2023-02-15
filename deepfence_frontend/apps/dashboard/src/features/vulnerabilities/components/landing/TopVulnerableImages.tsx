import { truncate } from 'lodash-es';
import { HiArrowSmRight } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { Card } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { ReactECharts } from '@/components/ReactEcharts';
import { Mode, useTheme } from '@/theme/ThemeContext';

export const TopContainers = ({ theme }: { theme: Mode }) => {
  return (
    <ReactECharts
      theme={theme === 'dark' ? 'dark' : 'light'}
      option={{
        backgroundColor: 'transparent',
        dataset: {
          source: [
            ['Container Name', 'Low', 'Medium', 'High', 'Critical'],
            ['nginx:latest', 4, 1, 4, 1],
            ['mysql:latest', 2, 4, 4, 1],
            ['wordpress:latest', 3, 6, 4, 1],
            ['deepfenceio/haproxy:latest', 5, 3, 4, 2],
            ['deepfenceio/test-123-123:latest', 3, 0, 4, 7],
          ],
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
          confine: true,
        },
        legend: {
          data: ['Low', 'Medium', 'High', 'Critical'],
          bottom: 0,
        },
        grid: {
          left: '2%',
          right: '5%',
          top: '10%',
          bottom: '20%',
          containLabel: true,
        },
        xAxis: {
          type: 'value',
        },
        yAxis: {
          type: 'category',
          axisLabel: {
            formatter: (value: string) => {
              return truncate(value, { length: 13 });
            },
          },
          axisTick: {
            show: false,
          },
        },
        series: [
          {
            type: 'bar',
            stack: 'total',
            label: {
              show: true,
            },
          },
          {
            type: 'bar',
            stack: 'total',
            label: {
              show: true,
            },
          },
          {
            type: 'bar',
            stack: 'total',
            label: {
              show: true,
            },
          },
          {
            type: 'bar',
            stack: 'total',
            label: {
              show: true,
            },
          },
        ],
      }}
    />
  );
};

export const TopVulnerableImages = () => {
  const { mode } = useTheme();
  return (
    <Card className="w-full py-2 px-3 flex flex-col">
      <div className="flex">
        <h4 className="text-gray-900 text-md dark:text-white">
          Top Vulnerable Running Images
        </h4>
        <DFLink to={'/'} className="flex items-center hover:no-underline ml-auto mr-2">
          <span className="text-xs text-blue-600 dark:text-blue-500">Details</span>
          <IconContext.Provider
            value={{
              className: 'text-blue-600 dark:text-blue-500 ',
            }}
          >
            <HiArrowSmRight />
          </IconContext.Provider>
        </DFLink>
      </div>
      <div className="basis-60">
        <TopContainers theme={mode} />
      </div>
    </Card>
  );
};
