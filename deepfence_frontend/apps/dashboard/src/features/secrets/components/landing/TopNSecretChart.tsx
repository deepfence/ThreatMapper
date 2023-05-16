import { truncate } from 'lodash-es';

import { ReactECharts } from '@/components/ReactEcharts';
import { SEVERITY_COLORS } from '@/constants/charts';
import { Mode } from '@/theme/ThemeContext';

export interface TopNSecretChartData {
  name: string;
  low: number;
  high: number;
  medium: number;
  critical: number;
  unknown: number;
}

export const TopNSecretChart = ({
  theme,
  data,
  loading,
}: {
  theme: Mode;
  data: Array<TopNSecretChartData>;
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
              name: 'critical',
              displayName: 'Critical',
            },
            {
              name: 'high',
              displayName: 'High',
            },
            {
              name: 'medium',
              displayName: 'Medium',
            },
            {
              name: 'low',
              displayName: 'Low',
            },
            {
              name: 'unknown',
              displayName: 'Unknown',
            },
          ],
          source: [...data].reverse(),
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
          confine: true,
        },
        legend: {
          data: ['Critical', 'High', 'Medium', 'Low', 'Unknown'],
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
          axisLine: {
            show: false,
          },
          axisTick: {
            show: false,
          },
        },
        series: [
          {
            type: 'bar',
            stack: 'total',
            color: SEVERITY_COLORS['critical'],
          },
          {
            type: 'bar',
            stack: 'total',
            color: SEVERITY_COLORS['high'],
          },
          {
            type: 'bar',
            stack: 'total',
            color: SEVERITY_COLORS['medium'],
          },
          {
            type: 'bar',
            stack: 'total',
            color: SEVERITY_COLORS['low'],
          },
          {
            type: 'bar',
            stack: 'total',
            color: SEVERITY_COLORS['unknown'],
          },
        ],
      }}
    />
  );
};
