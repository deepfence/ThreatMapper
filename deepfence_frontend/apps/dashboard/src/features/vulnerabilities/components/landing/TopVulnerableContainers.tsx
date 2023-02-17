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
          dimensions: [
            {
              name: 'containerName',
              displayName: 'Container Name',
            },
            {
              name: 'low',
              displayName: 'Low',
            },
            {
              name: 'medium',
              displayName: 'Medium',
            },
            {
              name: 'high',
              displayName: 'High',
            },
            {
              name: 'critical',
              displayName: 'Critical',
            },
          ],
          source: [
            {
              containerName: 'nginx:latest',
              low: 400,
              medium: 100,
              high: 246,
              critical: 118,
            },
            {
              containerName: 'mysql:latest',
              low: 12,
              medium: 108,
              high: 321,
              critical: 89,
            },
            {
              containerName: 'wordpress:latest',
              low: 40,
              medium: 189,
              high: 370,
              critical: 110,
            },
            {
              containerName: 'deepfenceio/haproxy:latest',
              low: 234,
              medium: 456,
              high: 66,
              critical: 200,
            },
            {
              containerName: 'deepfenceio/test-123-123:latest',
              low: 40,
              medium: 134,
              high: 410,
              critical: 334,
            },
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
          bottom: '15%',
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

export const TopVulnerableContainers = () => {
  const { mode } = useTheme();
  return (
    <Card className="w-full py-2 px-3 flex flex-col">
      <div className="flex">
        <h4 className="text-gray-900 text-md dark:text-white">
          Top Vulnerable Running Containers
        </h4>
        <DFLink
          to={'/vulnerability/scan-results/container'}
          className="flex items-center hover:no-underline active:no-underline focus:no-underline ml-auto mr-2"
        >
          <span className="text-xs text-blue-600 dark:text-blue-500">Go to Scans</span>
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
