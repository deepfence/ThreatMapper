import { EChartsOption } from 'echarts';

import { ReactECharts } from '@/components/ReactEcharts';
import { SEVERITY_COLORS } from '@/constants/charts';
import { Mode } from '@/theme/ThemeContext';

const option: EChartsOption = {
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
  },
  legend: {
    show: false,
  },

  dataset: {
    source: [],
  },
  series: [
    {
      type: 'pie',
      radius: ['70%', '90%'],
      avoidLabelOverlap: true,
      label: {
        show: false,
        position: 'center',
      },
      cursor: 'default',
      color: [
        SEVERITY_COLORS['critical'],
        SEVERITY_COLORS['high'],
        SEVERITY_COLORS['medium'],
        SEVERITY_COLORS['low'],
        SEVERITY_COLORS['unknown'],
      ],
    },
  ],
};

export const SecretsResultChart = ({
  theme,
  data,
}: {
  theme: Mode;
  data: { [key: string]: number };
}) => {
  if (!data) {
    return null;
  }

  option.dataset = {
    source: Object.keys(data).map((key) => ({
      Secrets: key,
      value: data[key],
    })),
  };
  return <ReactECharts theme={theme === 'dark' ? 'dark' : 'light'} option={option} />;
};
