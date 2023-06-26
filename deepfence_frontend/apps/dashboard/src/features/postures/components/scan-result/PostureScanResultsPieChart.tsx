import { EChartsOption } from 'echarts';
import { preset } from 'tailwind-preset';

import { ReactECharts } from '@/components/ReactEcharts';
import { abbreviateNumber } from '@/utils/number';

function getChartOptions({
  data,
  color,
}: {
  data: { [key: string]: number };
  color: string[];
}) {
  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      show: false,
    },
    legend: {
      show: false,
    },
    dataset: {
      source: Object.keys(data).map((key) => ({
        Secrets: key,
        value: data[key],
      })),
    },
    series: [
      {
        type: 'pie',
        radius: ['65%', '90%'],
        itemStyle: {
          borderWidth: 2,
          borderColor: preset.theme.extend.colors.bg.card,
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
          fontSize: '30px',
          color: preset.theme.extend.colors.text['input-value'],
          fontWeight: 600,
          fontFamily: preset.theme.extend.fontFamily.sans.join(','),
        },
        cursor: 'default',
        emphasis: {
          scale: false,
        },
        color,
      },
    ],
  };
  return option;
}

export const PostureScanResultsPieChart = ({
  data,
  color,
}: {
  data: { [key: string]: number };
  color: string[];
}) => {
  if (!data) {
    return null;
  }
  const options = getChartOptions({ data, color });
  return <ReactECharts theme="dark" option={options} />;
};
