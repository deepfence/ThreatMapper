import { Bar, BarConfig } from '@ant-design/plots';

export const TopContainers = () => {
  const data = [
    {
      node: 'wordpress:latest',
      type: 'low',
      value: 67,
    },
    {
      node: 'deepfenceio/log4j-vulnerable-app:latest',
      type: 'low',
      value: 153,
    },
    {
      node: 'mysql:latest',
      type: 'low',
      value: 22,
    },
    {
      node: 'nginx:latest',
      type: 'low',
      value: 20,
    },
    {
      node: 'wordpress:latest',
      type: 'medium',
      value: 494,
    },
    {
      node: 'deepfenceio/log4j-vulnerable-app:latest',
      type: 'medium',
      value: 124,
    },
    {
      node: 'mysql:latest',
      type: 'medium',
      value: 90,
    },
    {
      node: 'nginx:latest',
      type: 'medium',
      value: 121,
    },
    {
      node: 'deepfenceio/haproxy-log4j:latest',
      type: 'medium',
      value: 2,
    },
    {
      node: 'wordpress:latest',
      type: 'high',
      value: 348,
    },
    {
      node: 'deepfenceio/log4j-vulnerable-app:latest',
      type: 'high',
      value: 53,
    },
    {
      node: 'mysql:latest',
      type: 'high',
      value: 94,
    },
    {
      node: 'nginx:latest',
      type: 'high',
      value: 80,
    },
    {
      node: 'deepfenceio/haproxy-log4j:latest',
      type: 'high',
      value: 6,
    },
    {
      node: 'wordpress:latest',
      type: 'critical',
      value: 79,
    },
    {
      node: 'deepfenceio/log4j-vulnerable-app:latest',
      type: 'critical',
      value: 14,
    },
    {
      node: 'mysql:latest',
      type: 'critical',
      value: 25,
    },
    {
      node: 'nginx:latest',
      type: 'critical',
      value: 37,
    },
    {
      node: 'deepfenceio/haproxy-log4j:latest',
      type: 'critical',
      value: 3,
    },
  ];
  const config: BarConfig = {
    data,
    isStack: true,
    xField: 'value',
    yField: 'node',
    seriesField: 'type',
    height: 200,
    appendPadding: 10,
    maxBarWidth: 10,
    animation: false,
    barStyle: {
      // stroke: dfStyles.background,
    },
    legend: {
      layout: 'horizontal',
      position: 'top',
      label: {
        style: {
          fill: '#8f93a2',
          fontSize: 24,
        },
      },
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
            stroke: 'transparent',
          },
        },
      },
    },
    yAxis: {
      label: {
        style: {
          fontSize: 14,
          // fontFamily: dfStyles.fontFamily,
          fill: '#8f93a2',
        },
        formatter: (el) => (el.length > 14 ? `${el.substring(0, 13)}...` : `${el}`),
      },
    },
    // color: ({ type }) => getComplianceColor(type),
    interactions: [{ type: 'element-active' }],
    state: {
      active: {
        animate: { duration: 100, easing: 'easeLinear' },
        // style: ({ data }) => getActiveStyle(data),
      },
    },
    axis: {
      title: null,
    },
  };
  return <Bar {...config} />;
};
