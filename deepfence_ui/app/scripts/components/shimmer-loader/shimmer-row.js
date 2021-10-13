import React from 'react';
import './styles.scss';

export const ShimmerLoaderRow = ({ numberOfRows }) => {
  const shimmerRows = [];
  for (let i = 0; i < numberOfRows; i += 1) {
    shimmerRows.push(
      <div key={i} className="shimmer-loading-row">
        <div className="cell animate w40" />
        <div className="cell animate w20" />
        <div className="cell animate w60" />
      </div>
    );
  }

  return <div className="shimmer-rows">{shimmerRows}</div>;
};
