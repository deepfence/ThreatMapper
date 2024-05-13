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
      radius: ['65%', '91%'],
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
        color: isDarkTheme ? color['text-input-value'] : color['text-icon'],
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
        series,
      }}
      onChartClick={({ name }: { name: string; value: string | number | Date }) => {
        window.open(`${to}=${name.toLowerCase()}`, '_blank', 'noopener, noreferrer');
      }}
    />
  );
};
