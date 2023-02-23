import { truncate } from 'lodash-es';

import { ReactECharts } from '@/components/ReactEcharts';
import { Mode } from '@/theme/ThemeContext';

export interface TopNVulnerableChartData {
  name: string;
  low: number;
  high: number;
  medium: number;
  critical: number;
}

export const TopNVulnerableChart = ({
  theme,
  data,
  loading,
}: {
  theme: Mode;
  data: Array<TopNVulnerableChartData>;
  loading?: boolean;
}) => {
  return (
    <ReactECharts
      theme={theme === 'dark' ? 'dark' : 'light'}
      loading={loading}
      option={{
        backgroundColor: 'transparent',
        title: {
          show: !data.length && !loading,
          textStyle: {
            color: 'grey',
            fontSize: 20,
          },
          text: 'No data',
          left: 'center',
          top: 'center',
        },
        dataset: {
          dimensions: [
            {
              name: 'name',
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
          source: data,
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
