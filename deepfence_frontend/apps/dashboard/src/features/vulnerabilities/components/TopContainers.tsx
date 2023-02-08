import { Bar } from '@ant-design/charts';

export const TopContainers = () => {
  const data = [
    {
      year: '1991',
      value: 3,
      type: 'Lon',
    },
    {
      year: '1992',
      value: 4,
      type: 'Lon',
    },
    {
      year: '1993',
      value: 3.5,
      type: 'Lon',
    },
    {
      year: '1994',
      value: 5,
      type: 'Lon',
    },
    {
      year: '1995',
      value: 4.9,
      type: 'Lon',
    },
    {
      year: '1991',
      value: 3,
      type: 'Bor',
    },
    {
      year: '1992',
      value: 4,
      type: 'Bor',
    },
    {
      year: '1993',
      value: 3.5,
      type: 'Bor',
    },
    {
      year: '1994',
      value: 5,
      type: 'Bor',
    },
    {
      year: '1995',
      value: 4.9,
      type: 'Bor',
    },
  ];
  const config = {
    data: data.reverse(),
    isStack: true,
    xField: 'value',
    yField: 'year',
    seriesField: 'type',
    maxBarWidth: 10,
    appendPadding: 10,
    animation: false,
    height: 180,
    label: {
      // 可手动配置 label 数据标签位置
      position: 'middle',
      // 'left', 'middle', 'right'
      // 可配置附加的布局方法
      layout: [
        // 柱形图数据标签位置自动调整
        {
          type: 'interval-adjust-position',
        }, // 数据标签防遮挡
        {
          type: 'interval-hide-overlap',
        }, // 数据标签文颜色自动调整
        {
          type: 'adjust-color',
        },
      ],
    },
    legend: {
      layout: 'horizontal',
      position: 'bottom',
    },
    axis: {
      title: null,
    },
    xAxis: {
      label: {
        style: {
          fontSize: 14,
          fill: '#8f93a2',
        },
      },
      grid: {
        line: {
          style: {
            stroke: '#E5E7EB',
          },
        },
      },
    },
    yAxis: {
      label: {
        style: {
          fontSize: 14,
          fill: '#8f93a2',
        },
        formatter: (el) => (el.length > 14 ? `${el.substring(0, 13)}...` : `${el}`),
      },
    },
    interactions: [{ type: 'element-active' }],
    state: {
      active: {
        animate: { duration: 100, easing: 'easeLinear' },
        // style: ({ data }) => getActiveStyle(data),
      },
    },
  };
  return <Bar {...config} />;
};
