import { EChartsOption } from 'echarts';

import { ReactECharts } from '@/components/ReactEcharts';
import { SEVERITY_COLORS } from '@/constants/charts';
import { Mode } from '@/theme/ThemeContext';

function getChartOptions(severityBreakdown: {
  critical: number;
  high: number;
  medium: number;
  low: number;
  unknown: number;
}) {
  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
    },
    legend: {
      show: false,
    },
    series: [
      {
        name: 'Severities',
        type: 'pie',
        radius: ['70%', '90%'],
        top: '10%',
        avoidLabelOverlap: true,
        label: {
          show: false,
          position: 'center',
        },
        color: [
          SEVERITY_COLORS['critical'],
          SEVERITY_COLORS['high'],
          SEVERITY_COLORS['medium'],
          SEVERITY_COLORS['low'],
          SEVERITY_COLORS['unknown'],
        ],
      },
    ],
    dataset: {
      source: [
        { value: severityBreakdown.critical, severity: 'Critical' },
        { value: severityBreakdown.high, severity: 'High' },
        { value: severityBreakdown.medium, severity: 'Medium' },
        { value: severityBreakdown.low, severity: 'Low' },
        { value: severityBreakdown.unknown, severity: 'Unknown' },
      ],
    },
  };

  return option;
}

export const TopRisksDonutChart = ({
  theme,
  severityBreakdown,
}: {
  theme: Mode;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
}) => {
  return (
    <ReactECharts
      theme={theme === 'dark' ? 'dark' : 'light'}
      option={getChartOptions(severityBreakdown)}
    />
  );
};
