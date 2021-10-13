import React from 'react';

import { formatMetric } from '../../utils/string-utils';
// eslint-disable-next-line import/no-cycle
import { dismissRowClickProps } from './node-details-table-row';


export const NodeDetailsTableNodeMetricLink = (props) => {
  const {
    style, value, valueEmpty
  } = props;
  return (
    <td
      className="node-details-table-node-metric"
      style={style}
      {...dismissRowClickProps}
  >
      {!valueEmpty && formatMetric(value, props)}
    </td>
  );
};
