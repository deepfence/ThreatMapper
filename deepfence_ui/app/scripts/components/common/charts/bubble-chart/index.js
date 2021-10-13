/* eslint-disable no-useless-return */
/* eslint-disable no-else-return */
import React, { useEffect, useState, useRef } from 'react';
import { CirclePacking } from '@antv/g2plot';
// eslint-disable-next-line import/no-unresolved
import dfStyles from '@deepfence-theme';
import { severityColorsCirclePacking } from '../../../../constants/colors';

const BubbleChart = props => {
  const { data, onSectionClick = () => {} } = props;

  const [plotData, setPlotData] = useState(null);

  const severity = ['vulnerabilities', 'low', 'medium', 'high', 'critical'];

  const container = useRef(null);
  useEffect(() => {
    if (container.current === null) {
      return;
    }
    const plot = new CirclePacking(container.current, {
      autoFit: true,
      padding: 0,
      data,
      theme: 'dark',
      height: 500,
      width: 500,
      colorField: 'name',
      color: severityColorsCirclePacking,
      pointStyle: {
        stroke: severityColorsCirclePacking,
        lineWidth: 0.8,
      },
      hierarchyConfig: { padding: 0.05, autoFit: true },
      label: {
        style: {
          opacity: 1,
          fontSize: dfStyles.fontChartSize,
          fontWeight: dfStyles.fontChartWeight,
          fontFamily: dfStyles.fontFamily,
          fill: dfStyles.fontColorCharts,
        },
        autoHide: true,
        offset: -3,
        position: 'bottom',
        layout: 'fixedOverlap',
        textAlign: 'center',
        formatter: el => (severity.includes(el.name) ? '' : el.value),
      },
      tooltip: {
        domStyles: {
          'g2-tooltip' : {
            padding: '10px'
          },
        },
        customContent: (title, data)  => {
          if(data[0]?.name === 'vulnerabilities') {
            return `Most Exploitable Vunlerabilities : ${data[0]?.value}` ;
          }
          return `${data[0]?.name} : ${data[0]?.value}`;
        }
      }
    });
    plot.render();
    plot.on('plot:click', (...args) => {
      onSectionClick(args[0].data.data.path);
    });
    setPlotData(plot);
  }, [container]);

  useEffect(() => {
    if (container.current === null || data === null || plotData === null) {
      return;
    }
    plotData.update({ data });
  }, [data]);

  return <div ref={container} />;
};

export default BubbleChart;
