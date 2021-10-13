import React from 'react';
import { Sunburst } from '@ant-design/charts';
import dfStyles from '@deepfence-theme';
import { severityColorsSunBurstShade } from '../../../../constants/colors';

const SunburstChart = props => {
  const {
    data = [],
    onSectionClick = () => {},
    chartHeight,
    chartWidth,
    colors,
  } = props;

  const getActiveStyle = ({ path }) => ({
    fill: severityColorsSunBurstShade(path),
    strokeWidth: 0,
  });

  const config = {
    data,
    width: chartWidth,
    height: chartHeight,
    innerRadius: 0.2,
    renderer: 'canvas',
    theme: 'dark',
    colorField: 'name',
    color: colors,
    hierarchyConfig: { field: 'value' },
    animation: false,
    drilldown: {
      enabled: false,
    },
    label: {
      style: {
        opacity: 1,
        fontSize: 12,
        fontWeight: dfStyles.fontChartWeight,
        fontFamily: dfStyles.fontFamily,
        fill: dfStyles.fontColorCharts,
      },
      autoHide: true,
      labelEmit: true,
      position: 'bottom',
      layout: 'fixedOverlap',
      textAlign: 'center',
      formatter: el =>
        el.name.length > 14 ? `${el.name.substring(0, 12)}...` : `${el.name}`,
    },
    sunburstStyle: {
      stroke: dfStyles.chartBorderLineColor,
      fillOpacity: 1,
      lineWidth: dfStyles.chartBorderLineWidth,
    },
    interactions: [{ type: 'element-active' }],
    state: {
      active: {
        style: ({ data }) => getActiveStyle(data),
      },
    },
  };
  return (
    <div>
      <Sunburst
        {...config}
        onReady={plot => {
          plot.on('element:click', (...args) => {
            onSectionClick(args[0].data.data);
          });
        }}
      />
    </div>
  );
};

export default SunburstChart;
