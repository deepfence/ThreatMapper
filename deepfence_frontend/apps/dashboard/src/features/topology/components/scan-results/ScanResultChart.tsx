import { ReactECharts } from '@/components/ReactEcharts';
import { Mode } from '@/theme/ThemeContext';

export const ScanResultChart = ({
  theme,
  data,
}: {
  theme: Mode;
  data: Array<{ value: number; name: string; color: string }>;
}) => {
  if (!data.length) {
    return null;
  }

  const totalValue = data.reduce((prev, record) => prev + record.value, 0);

  return (
    <ReactECharts
      theme={theme === 'dark' ? 'dark' : 'light'}
      option={{
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
        },
        legend: {
          top: '85%',
          left: 'center',
          selectedMode: false,
        },
        series: [
          {
            name: 'Severity',
            type: 'pie',
            top: '-20%',
            bottom: '-30%',
            radius: ['80%', '100%'],
            center: ['50%', '70%'],
            cursor: 'default',
            // adjust the start angle
            startAngle: 180,
            label: {
              show: false,
              formatter(param) {
                return param.name;
              },
            },
            data: [
              ...data.map((d) => ({
                value: d.value,
                name: d.name,
                itemStyle: { color: d.color },
              })),
              {
                // make an record to fill the bottom 50%
                value: totalValue,
                itemStyle: {
                  color: 'none',
                  decal: {
                    symbol: 'none',
                  },
                },
                label: {
                  show: false,
                },
              },
            ],
          },
        ],
      }}
    />
  );
};
