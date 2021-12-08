/* eslint-disable react/destructuring-assignment */
import React, { useState } from 'react';

import JSONView from './json-view';

export const RowExpandView = ({data}) => {
  const [isJSONViewVisible, setIsJSONViewVisible] = useState(false);
  const valueWidth = {
    width: '82%',
    textAlign: 'left',
    padding: '2px 10px'
  };
  const iconStyles = {
    cursor: 'pointer'
  };
  function toggleTabView() {
    setIsJSONViewVisible((prevVal) => !prevVal);
  }
  return (
    <div style={valueWidth}>
      { isJSONViewVisible
        ? <div className="fa fa-minus-square" style={iconStyles} aria-hidden="true" onClick={toggleTabView} />
        : <div className="fa fa-plus-square" style={iconStyles} aria-hidden="true" onClick={toggleTabView} />
      }
      { isJSONViewVisible && <JSONView data={data} /> }
    </div>
  );
}
