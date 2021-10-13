/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { RadialBar } from '@ant-design/charts';

const RadialBarChart = props => {
  const {
    data,
    onSectionClick = () => {},
    colorCb = () => {},
    colorShadeCb = () => {},
    chartWidth,
    chartHeight,
    stacking,
  } = props;
  const config = {
    data,
    width: chartWidth,
    height: chartHeight,
    xField: 'cve_type',
    yField: 'value',
    colorField: 'type',
    animation: false,
    xAxis: {
      label: {
        style: {
          fontSize: 14,
          fill: '#b2b0b2',
        },
      },
      top: true,
      nice: false,
      grid: {
        line: {
          style: {
            stroke: '#242424',
          },
        },
      },
    },
    isStack: stacking,
    theme: 'dark',
    maxAngle: 270,
    radius: 0.8,
    innerRadius: 0.2,
    minBarWidth: 16,
    maxBarWidth: 20,
    legend: true,
    color: colorCb,
    interactions: [{ type: 'element-active' }],
    state: {
      active: {
        style: colorShadeCb,
      },
    },
  };
  return (
    <RadialBar
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...config}
      onReady={plot => {
        plot.on('element:click', (...args) => {
          onSectionClick(args[0].data.data);
        });
      }}
    />
  );
};

export default RadialBarChart;
