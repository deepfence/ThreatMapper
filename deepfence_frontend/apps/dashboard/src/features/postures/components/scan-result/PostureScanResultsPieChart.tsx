import { colors, preset } from 'tailwind-preset';

import { ECOption, ReactECharts } from '@/components/ReactEcharts';
import { getPostureColor } from '@/constants/charts';
import { Mode, THEME_DARK, useTheme } from '@/theme/ThemeContext';
import { PostureSeverityType } from '@/types/common';
import { abbreviateNumber } from '@/utils/number';

function getChartOptions({
  data,
  theme,
}: {
  data: { [key: string]: number };
  theme: Mode;
}) {
  const isDarkTheme = theme === THEME_DARK;
  const color = colors[isDarkTheme ? 'darkVariables' : 'variables'].DEFAULT;
  const series: ECOption['series'] = [
    {
      type: 'pie',
      radius: ['58%', '80%'],
      itemStyle: {
        borderWidth: 2,
        borderColor: color['bg-card'],
      },
      label: {
        position: 'center',
        formatter: function () {
          return 'Total';
        },
        fontSize: '14px',
        offset: [0, 20],
        color: color['text-input-value'],
        fontWeight: 600,
        fontFamily: preset.theme.extend.fontFamily.sans.join(','),
      },
      cursor: 'none',
      emphasis: {
        scale: false,
      },
      data: Object.keys(data)
        .filter((key) => data[key] > 0)
        .map((key) => {
          return {
            value: data[key],
            name: key,
            itemStyle: {
              color:
                getPostureColor(theme)[key as PostureSeverityType] ??
                getPostureColor(theme)['skip'],
            },
          };
        }),
    },
    {
      type: 'pie',
      radius: isDarkTheme ? ['60%', '85%'] : ['64%', '85%'],
      itemStyle: {
        borderWidth: 2,
        borderColor: color['bg-card'],
      },
      label: {
        position: 'center',
        formatter: function () {
          return abbreviateNumber(
            Object.keys(data).reduce((prev, curr) => {
              return prev + data[curr];
            }, 0),
          ).toString();
        },
        fontSize: '24px',
        offset: [0, -5],
        color: color['text-input-value'],
        fontWeight: 600,
        fontFamily: preset.theme.extend.fontFamily.sans.join(','),
      },
      cursor: 'pointer',
      emphasis: {
        scale: false,
      },
      data: Object.keys(data)
        .filter((key) => data[key] > 0)
        .map((key) => {
          return {
            value: data[key],
            name: key,
            itemStyle: {
              color:
                getPostureColor(theme)[key as PostureSeverityType] ??
                getPostureColor(theme)['skip'],
            },
          };
        }),
    },
  ];

  const option: ECOption = {
    backgroundColor: 'transparent',
    tooltip: {
      show: false,
    },
    legend: {
      show: false,
    },
    series: theme === THEME_DARK ? [series[1]] : series,
  };
  return option;
}

export const PostureScanResultsPieChart = ({
  data,
  onChartClick,
}: {
  data: { [key: string]: number };
  onChartClick: (data: { name: string; value: string | number | Date }) => void;
}) => {
  const { mode } = useTheme();
  if (!data) {
    return null;
  }
  const options = getChartOptions({ data, theme: mode });
  return <ReactECharts theme="dark" option={options} onChartClick={onChartClick} />;
};
