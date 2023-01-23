/* eslint-disable react/no-array-index-key */
/* eslint-disable no-unused-vars */
/* eslint-disable react/jsx-key */
/* eslint-disable arrow-body-style */
import classNames from 'classnames';
import React from 'react';
import styles from './header.module.scss';

const HeaderKVPair = ({ dataKey, value, valueAsText }) => {
  return (
    <div className={styles.alertSummaryItem}>
      <div className={styles.alertSummaryItemTitle}>{dataKey}</div>
      <div className={styles.alertSummaryItemContent} title={valueAsText}>{valueAsText}</div>
    </div>
  );
}

const HeaderControlAction = ({
  title,
  label,
  icon,
  onClick,
  loading
}) => {
  return (
    <button
      type="button"
      className={classNames("primary-btn", styles.actionButton)}
      onClick={onClick}
      title={title}
      disabled={loading}
    >
      {icon}
      {label}
    </button>
  )
}


// data is an array of key value pairs
export const DetailModalHeader = ({
  data,
  onRequestClose,
  actions
}) => {
  return (
    <div className={styles.headerContainer}>
      <div className={styles.wrapper}>
        <div className={styles.contentWrapper}>
          {data && data.length ? (
            data.map((data, index) => {
              return <HeaderKVPair dataKey={data.key} value={data.value} valueAsText={data.valueAsText ?? ''} key={index} />
            })
          ) : null}
        </div>
        <div className={styles.controlsWrapper}>
          {actions && actions.length ? (
            actions.map((action) => {
              return <HeaderControlAction
                icon={action.icon}
                label={action.label}
                onClick={action.onClick}
                title={action.title}
                key={action.label}
                loading={action.loading}
              />
            })
          ) : null}
          <div className={styles.closeButton} onClick={() => {
            if (onRequestClose) onRequestClose();
          }} title="close">
            <i className="fa fa-times" aria-hidden="true" />
          </div>
        </div>
      </div>
      <hr className={styles.hr} />
    </div>
  );
}
