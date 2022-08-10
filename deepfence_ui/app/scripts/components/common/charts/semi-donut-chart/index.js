/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { Pie } from '@ant-design/charts';
import dfStyles from '@deepfence-theme';
import {

  complianceDonutColors,
  getComplianceColorActive,
} from '../../../../constants/colors';

const chartColors = ({ label }) => {
  if (label === 'critical') {
    return complianceDonutColors.critical;
  }
  if (label === 'high') {
    return complianceDonutColors.high;
  }
  if (label === 'medium') {
    return complianceDonutColors.medium;
  }
  if (label === 'low') {
    return complianceDonutColors.low;
  }
  if (label === 'total') {
    return complianceDonutColors.total;
  }
  if (label === 'scanned') {
    return complianceDonutColors.scanned;
  }
  if (label === 'fail') {
    return complianceDonutColors.fail;
  }
  if (label === 'ok') {
    return complianceDonutColors.pass;
  }
  if (label === 'info') {
    return complianceDonutColors.info;
  }
  if (label === 'note') {
    return complianceDonutColors.note;
  }
  if (label === 'alarm') {
    return complianceDonutColors.warn;
  }
  if (label === 'skip') {
    return complianceDonutColors.medium;
  }
  if (label === 'pass') {
    return complianceDonutColors.pass;
  }
  if (label === 'warn') {
    return complianceDonutColors.critical;
  }
};

const chartPieStyle = el => {
  if (el.label === 'critical') {
    return {
      stroke: complianceDonutColors.critical,
      opacity: 0.8,
    };
  }
  if (el.label === 'high') {
    return {
      stroke: complianceDonutColors.high,
      opacity: 0.8,
    };
  }
  if (el.label === 'medium') {
    return {
      stroke: complianceDonutColors.medium,
      opacity: 0.8,
    };
  }
  if (el.label === 'low') {
    return {
      stroke: complianceDonutColors.low,
      opacity: 0.8,
    };
  }
  if (el.label === 'scanned') {
    return {
      stroke: complianceDonutColors.scanned,
      opacity: 0.8,
    };
  }
  if (el.label === 'total') {
    return {
      stroke: complianceDonutColors.total,
      opacity: 0.8,
    };
  }
  if (el.label === 'fail') {
    return {
      stroke: complianceDonutColors.fail,
      opacity: 0.8,
    };
  }
  if (el.label === 'ok') {
    return {
      stroke: complianceDonutColors.pass,
      opacity: 0.8,
    };
  }
  if (el.label === 'info') {
    return {
      stroke: complianceDonutColors.info,
      opacity: 0.8,
    };
  }
  if (el.label === 'note') {
    return {
      stroke: complianceDonutColors.note,
      opacity: 0.8,
    };
  }
  if (el.label === 'alarm') {
    return {
      stroke: complianceDonutColors.warn,
      opacity: 0.8,
    };
  }
  if (el.label === 'skip') {
    return {
      stroke: complianceDonutColors.medium,
      opacity: 0.8,
    };
  }
  if (el.label === 'pass') {
    return {
      stroke: complianceDonutColors.pass,
      opacity: 0.8,
    };
  }
  if (el.label === 'warn') {
    return {
      stroke: complianceDonutColors.critical,
      opacity: 0.8,
    };
  }
};

const SemiDonutChart = props => {
  const {
    data,
    onSectionClick = () => {},
    subtitle,
    chartHeight,
    chartWidth,
    innerRadius,
  } = props;

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
    color: chartColors,
    pieStyle: chartPieStyle,
    startAngle: Math.PI,
    endAngle: Math.PI * 2,
    radius: 1,
    innerRadius,
    title: subtitle,
    animation: false,
    label: {
      type: 'inner',
      offset: '-50%',
      content: '{value}',
      height: 600,
      style: {
        textAlign: 'center',
        fontSize: 14,
        fill: dfStyles.fontColorCharts,
        fontFamily: dfStyles.fontFamily,
      },
      autoRotate: false,
    },
    statistic: {
      title: false,
      content: {
        offsetY: 50,
        style: {
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'white',
        },
      },
    },
    legend: {
      position: 'bottom',
      layout: 'horizontal',
    },
    interactions: [
      { type: 'element-active' },
      { type: 'pie-statistic-active' },
    ],
    state: {
      active: {
        style: ({ data }) => getActiveStyle(data),
      },
    },
  };
  return (
    <Pie
      {...config}
      onReady={plot => {
        plot.on('element:click', (...args) => {
          onSectionClick(args[0].data.data);
        });
      }}
    />
  );
};

export default SemiDonutChart;
