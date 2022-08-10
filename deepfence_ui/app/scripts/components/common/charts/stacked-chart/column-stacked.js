import React from 'react';
import { Column } from '@ant-design/charts';
import dfStyles from '@deepfence-theme';
import {
  getComplianceColorActive,
  getComplianceColor,
} from '../../../../constants/colors';

const StackedColumnChart = props => {
  const { onSectionClick = () => {}, data, chartHeight } = props;

  const getActiveStyle = ({ type }) => ({
    fill: getComplianceColorActive(type),
    strokeWidth: 0,
  });

  const config = {
    data,
    isStack: true,
    xField: 'node',
    yField: 'value',
    seriesField: 'type',
    theme: 'dark',
    height: chartHeight,
    appendPadding: 10,
    color: ({ type }) => getComplianceColor(type),
    maxBarWidth: 10,
    animation: false,
    legend: {
      layout: 'horizontal',
      position: 'bottom',
    },
    yAxis: {
      label: {
        style: {
          fontSize: 14,
          fill: '#b2b0b2',
          fontFamily: dfStyles.fontFamily,
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
    xAxis: {
      label: {
        autoHide: false,
        autoRotate: false,
        autoEllipsis: true,
        style: {
          fontSize: 14,
          fontFamily: dfStyles.fontFamily,
          fill: '#b2b0b2',
        },
        formatter: el => (el.length > 5 ? `${el.substring(0, 4)}...` : `${el}`),
      },
    },
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
    <Column
      {...config}
      onReady={plot => {
        plot.on('element:click', (...args) => {
          onSectionClick(args[0].data.data);
        });
      }}
    />
  );
};

export default StackedColumnChart;
