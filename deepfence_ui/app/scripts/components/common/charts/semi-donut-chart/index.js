/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { Pie } from '@ant-design/charts';
import dfStyles from '@deepfence-theme';
import {
  complianceColors,
  getComplianceColorActive,
} from '../../../../constants/colors';

const chartColors = ({ label }) => {
  if (label === 'critical') {
    return complianceColors.critical;
  }
  if (label === 'high') {
    return complianceColors.high;
  }
  if (label === 'medium') {
    return complianceColors.medium;
  }
  if (label === 'low') {
    return complianceColors.low;
  }
  if (label === 'total') {
    return complianceColors.total;
  }
  if (label === 'scanned') {
    return complianceColors.scanned;
  }
  if (label === 'fail') {
    return complianceColors.fail;
  }
  if (label === 'pass') {
    return complianceColors.pass;
  }
  if (label === 'info') {
    return complianceColors.info;
  }
  if (label === 'note') {
    return complianceColors.note;
  }
  if (label === 'warn') {
    return complianceColors.warn;
  }
};

const chartPieStyle = el => {
  if (el.label === 'critical') {
    return {
      stroke: complianceColors.critical,
      opacity: 0.8,
    };
  }
  if (el.label === 'high') {
    return {
      stroke: complianceColors.high,
      opacity: 0.8,
    };
  }
  if (el.label === 'medium') {
    return {
      stroke: complianceColors.medium,
      opacity: 0.8,
    };
  }
  if (el.label === 'low') {
    return {
      stroke: complianceColors.low,
      opacity: 0.8,
    };
  }
  if (el.label === 'scanned') {
    return {
      stroke: complianceColors.scanned,
      opacity: 0.8,
    };
  }
  if (el.label === 'total') {
    return {
      stroke: complianceColors.total,
      opacity: 0.8,
    };
  }
  if (el.label === 'fail') {
    return {
      stroke: complianceColors.fail,
      opacity: 0.8,
    };
  }
  if (el.label === 'pass') {
    return {
      stroke: complianceColors.pass,
      opacity: 0.8,
    };
  }
  if (el.label === 'info') {
    return {
      stroke: complianceColors.info,
      opacity: 0.8,
    };
  }
  if (el.label === 'note') {
    return {
      stroke: complianceColors.note,
      opacity: 0.8,
    };
  }
  if (el.label === 'warn') {
    return {
      stroke: complianceColors.warn,
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
