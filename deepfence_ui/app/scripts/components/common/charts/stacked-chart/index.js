import React from 'react';
import { Bar } from '@ant-design/charts';
import dfStyles from '@deepfence-theme';
import {
  getComplianceColor,
  getComplianceColorActive,
} from '../../../../constants/colors';

export function sortChartNodes(nodes) {
  const results = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    info: [],
  };

  nodes.forEach(node => {
    results[node.type].push(node);
  });

  return [...results.info, ...results.low, ...results.medium, ...results.high, ...results.critical];
}

const StackedChart = props => {
  const { onSectionClick = () => {}, data, chartHeight } = props;

  const getActiveStyle = ({ type }) => ({
    fill: getComplianceColorActive(type),
    strokeWidth: 0,
  });

  const config = {
    data,
    isStack: true,
    xField: 'value',
    yField: 'node',
    seriesField: 'type',
    theme: 'dark',
    height: chartHeight,
    appendPadding: 10,
    maxBarWidth: 10,
    animation: false,
    barStyle: {
      stroke: dfStyles.background,
    },
    legend: {
      layout: 'horizontal',
      position: 'bottom',
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
            stroke: '#181818',
          },
        },
      },
    },
    yAxis: {
      label: {
        style: {
          fontSize: 14,
          fontFamily: dfStyles.fontFamily,
          fill: '#8f93a2',
        },
        formatter: el =>
          el.length > 14 ? `${el.substring(0, 13)}...` : `${el}`,
      },
    },
    color: ({ type }) => getComplianceColor(type),
    interactions: [{ type: 'element-active' }],
    state: {
      active: {
        animate: { duration: 100, easing: 'easeLinear' },
        style: ({ data }) => getActiveStyle(data),
      },
    },
    axis: {
      title: null,
    },
  };
  return (
    <Bar
      {...config}
      onReady={plot => {
        plot.on('element:click', (...args) => {
          onSectionClick(args[0].data.data);
        });
      }}
    />
  );
};

export default StackedChart;
