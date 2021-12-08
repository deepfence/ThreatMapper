import React, { isValidElement } from 'react';
import { RowExpandView } from './row-expand-view';
import styles from './key-value-pair-table.module.scss';

function isValueString(value) {
  let isString = false;
  if (typeof value === 'string' || typeof value === 'number') {
    isString = true;
  } else {
    isString = false;
  }
  return isString;
}

function getStringValueView(stringValue) {
  return (
    <div className={styles.detailsValue}>{stringValue}</div>
  );
};

function renderJSX(jsx) {
  return (
    <div className={styles.detailsValue}> {jsx} </div>
  );
}


function renderObjects(data) {
  let rendered;
  // check if data is a valid JSX or React Element
  if (isValidElement(data)) {
    rendered = renderJSX(data);
    // check id JSX is embedded inside an array
  } else if (Array.isArray(data) && data.length > 0 && isValidElement(data[0])) {
    rendered = renderJSX(data);
  } else {
    rendered = getNestedValueView(data);
  }
  return rendered;
}

function getNestedValueView(data) {
  return (
    <RowExpandView data={data} />
  )
};


export const KeyValuePairTable = ({ data }) => {
  const { _source: sourceData } = data;

  const pairs = [];
  for (const key in sourceData) {
    if (sourceData[key]) {
      pairs.push(
        <div className={styles.keyValueRow} key={key}>
          <div className={styles.detailsKey}>{key}</div>
          {isValueString(sourceData[key]) ? getStringValueView(sourceData[key]) : renderObjects(sourceData[key])}
        </div>
      );
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className="container-fluid">
        <div className="col-12 col-md-8 col-lg-10" style={{ wordBreak: 'break-word' }}>
          {pairs}
        </div>
      </div>
    </div>
  );
}
