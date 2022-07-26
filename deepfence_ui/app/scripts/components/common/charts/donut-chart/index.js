import React from 'react';
import { Pie } from '@ant-design/charts';
// eslint-disable-next-line import/no-unresolved
import dfStyles from '@deepfence-theme';
import {
  getComplianceColor,
  getComplianceColorActive,
} from '../../../../constants/colors';

const DonutChart = props => {
  const { data } = props;
  const { sum, onSectionClick = () => {}, chartHeight, chartWidth } = props;

  const getActiveStyle = ({ label }) => ({
    fill: getComplianceColorActive(label),
    strokeWidth: 0,
  });

  const config = {
    data,
    angleField: 'value',
    colorField: 'label',
    height: chartHeight,
    width: chartWidth,
    color: ({ label }) => getComplianceColor(label),
    pieStyle: {
      stroke: dfStyles.background,
      opacity: 1,
      lineWidth: dfStyles.chartBorderLineWidth,
    },
    radius: 1,
    innerRadius: 0.4,
    animation: false,
    label: {
      offset: '-50%',
      content: '{value}',
      height: 600,
      style: {
        textAlign: 'center',
        fontSize: 14,
        fontFamily: dfStyles.fontFamily,
        fill: dfStyles.fontColorCharts,
      },
      autoRotate: false,
    },
    statistic: {
      title: false,
      content: {
        style: {
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        content: `${sum} Tests`,
      },
    },
    legend: {
      position: 'bottom',
      layout: 'horizontal',
    },
    interactions: [
      { type: 'pie-statistic-active' },
      { type: 'element-active' },
    ],
    state: {
      active: {
        animate: { duration: 100, easing: 'easeLinear' },
        style: ({ data }) => getActiveStyle(data),
      },
    },
  };

  return (
    <Pie
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

export default DonutChart;
