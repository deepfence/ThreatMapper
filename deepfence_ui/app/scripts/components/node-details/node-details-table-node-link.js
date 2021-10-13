/* eslint-disable react/destructuring-assignment */
/* eslint-disable import/no-cycle */
import React from 'react';

export const NodeDetailsTableNodeLink = ({ label, labelMinor }) => {
  const title = !labelMinor ? label : `${label} (${labelMinor})`;

  return (
    <span
      className="node-details-table-node-link"
      title={title}
      aria-hidden="true"
    >
      {label}
    </span>
  );
};
