/* eslint-disable react/destructuring-assignment */
/* eslint-disable */
import React, { memo } from 'react';
import { Sankey } from '@ant-design/charts';
import dfStyles from '@deepfence-theme';
import { sevColors } from '../../../../constants/colors';

const SankeyChart = props => {
  const { data } = props;
  var config = {
    data: data,
    sourceField: 'source',
    targetField: 'target',
    weightField: 'value',
    nodeWidthRatio: 0.008,
    nodePaddingRatio: 0.03,
    renderer: 'canvas',
    theme: 'dark',
    animation: false,
    nodeAlign: 'left',
    color: [
      sevColors.critical,
      sevColors.high,
      sevColors.medium,
      sevColors.low,
      sevColors.info,
    ],
    edgeStyle: {
      fillOpacity: 0.8,
    },
    label: {
      callback: x => {
        const isLast = x[1] === 1;
        return {
          style: {
            fill: dfStyles.background,
            fontSize: '12',
            fontFamily: dfStyles.fontFamily,
            textAlign: isLast ? 'end' : 'start',
          },
          offsetX: isLast ? -10 : 10,
        };
      },
    },
  };
  return <Sankey {...config} />;
};

export default memo(SankeyChart);
