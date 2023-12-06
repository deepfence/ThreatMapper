import { preset } from 'tailwind-preset';

import { ReactECharts } from '@/components/ReactEcharts';
import { Mode } from '@/theme/ThemeContext';
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
  const totalValue = data.reduce((prev, record) => prev + record.value, 0);

  return (
    <ReactECharts
      theme={theme === 'dark' ? 'dark' : 'light'}
      option={{
        backgroundColor: 'transparent',
        tooltip: {
          show: false,
        },
        legend: {
          show: false,
        },
        series: [
          {
            type: 'pie',
            radius: ['65%', '91%'],
            itemStyle: {
              borderWidth: 2,
              borderColor: preset.theme.extend.colors.bg.card,
            },
            label: {
              position: 'center',
              formatter: function () {
                return abbreviateNumber(totalValue).toString();
              },
              fontSize: '18px',
              color: preset.theme.extend.colors.text['input-value'],
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
        ],
      }}
      onChartClick={({ name }: { name: string; value: string | number | Date }) => {
        window.open(`${to}=${name.toLowerCase()}`, '_blank', 'noopener, noreferrer');
      }}
    />
  );
};
