/* eslint-disable arrow-body-style */
import classNames from 'classnames';
import React, { useState } from 'react';
import styles from './graph-type-selector.module.scss';

export const GraphTypeSelector = ({ onChange, graphOptions }) => {
  const [checkedOption, setCheckedOption] = useState(graphOptions[0]);
  const onSelectionChange = (e) => {
    const val = e.target?.value;
    setCheckedOption(graphOptions.find((option) => option.value === val));
    if (onChange) onChange(val);
  };
  return (
    <div className={styles.graphSelectContainer}>
      {
        graphOptions.map((option) => {
          return (
            <div key={option.value} className={classNames(styles.graphSelectItem, {
              [styles.selected]: checkedOption.value === option.value,
            }, styles[`option_${option.value}`])}>
              <input type="radio" id={`graph-selector-${option.value}`} name="graph-type" value={option.value} checked={checkedOption.value === option.value} onChange={onSelectionChange} />
              <label htmlFor={`graph-selector-${option.value}`}>
                {(checkedOption.value === option.value) ? <i className="fa fa-caret-right" style={{
                  marginLeft: '-10px',
                  marginRight: '4px'
                }} aria-hidden="true" /> : null }
                {option.label}
              </label>
            </div>
          );
        })
      }
    </div>
  )
};
