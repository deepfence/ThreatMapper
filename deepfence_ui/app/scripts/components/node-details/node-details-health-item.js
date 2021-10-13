/* eslint-disable */
import React from 'react';

import { formatMetric } from '../../utils/string-utils';
import SparkLineChart from '../common/sparkline-chart/sparkline-chart';

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function NodeDetailsHealthItem(props) {
  return (
    <div className="node-details-health-item">
      {!props.valueEmpty && (
        <div className="node-details-health-item-value">
          {props.format === 'filesize' ? formatBytes(props.value) : formatMetric(props.value, props)}
        </div>
      )}
      <div className="node-details-health-item-sparkline">
        <SparkLineChart
          data={props.samples}
          max={props.max}
          format={props.format}
          first={props.first}
          last={props.last}
          hoverColor={props.metricColor}
          hovered={props.hovered}
        />
      </div>
      <div className="node-details-health-item-label">
        {props.label}
      </div>
    </div>
  );
}

export default NodeDetailsHealthItem;
