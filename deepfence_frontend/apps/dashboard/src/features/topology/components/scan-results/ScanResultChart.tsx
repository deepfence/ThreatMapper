import { colors, preset } from 'tailwind-preset';

import { ECOption, ReactECharts } from '@/components/ReactEcharts';
import { Mode, THEME_DARK } from '@/theme/ThemeContext';
import { abbreviateNumber } from '@/utils/number';

export const ScanResultChart = ({
  theme,
  data,
  to,
}: {
  theme: Mode;
  data: Array<{ value: number; name: string; color: string }>;
  to: string;
}) => {
  const isDarkTheme = theme === THEME_DARK;
  const color = colors[isDarkTheme ? 'darkVariables' : 'variables'].DEFAULT;
  const totalValue = data.reduce((prev, record) => prev + record.value, 0);

  const series: ECOption['series'] = [
    {
      type: 'pie',
      radius: ['55%', '65%'],
      itemStyle: {
        borderWidth: 2,
        borderColor: color['bg-card'],
      },
      label: {
        position: 'center',
        formatter: function () {
          return 'Total';
        },
        fontSize: '13px',
        offset: [0, 15],
        color: isDarkTheme ? color['text-input-value'] : color['text-text-and-icon'],
        fontWeight: 400,
        fontFamily: preset.theme.extend.fontFamily.sans.join(','),
      },
      cursor: 'none',
      emphasis: {
        disabled: true,
      },
      data: [
        ...data.map((d) => ({
          value: d.value,
          name: d.name,
          itemStyle: { color: d.color },
        })),
      ],
    },
    {
      type: 'pie',
      radius: isDarkTheme ? ['65%', '91%'] : ['62%', '80%'],
      itemStyle: {
        borderWidth: 2,
        borderColor: color['bg-card'],
      },
      label: {
        position: 'center',
        formatter: function () {
          return abbreviateNumber(totalValue).toString();
        },
        fontSize: '18px',
        offset: [0, -5],
        color: color['text-input-value'],
        fontWeight: 600,
        fontFamily: preset.theme.extend.fontFamily.sans.join(','),
      },
      cursor: 'pointer',
      emphasis: {
        disabled: true,
      },
      data: [
        ...data.map((d) => ({
          value: d.value,
          name: d.name,
          itemStyle: { color: d.color },
        })),
      ],
    },
  ];
  return (
    <ReactECharts
      option={{
        backgroundColor: 'transparent',
        tooltip: {
          show: false,
        },
        legend: {
          show: false,
        },
        series: theme === THEME_DARK ? [series[1]] : series,
      }}
      onChartClick={({ name }: { name: string; value: string | number | Date }) => {
        window.open(`${to}=${name.toLowerCase()}`, '_blank', 'noopener, noreferrer');
      }}
    />
  );
};
