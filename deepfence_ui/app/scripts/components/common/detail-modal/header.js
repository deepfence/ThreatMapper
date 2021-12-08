/* eslint-disable arrow-body-style */
import classNames from 'classnames';
import React from 'react';
import styles from './header.module.scss';

export const DetailModalHeader = ({
  tabs,
  selectedTabId,
  onRequestClose,
  actions
}) => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.tabsWrapper}>
        {tabs && tabs.length ? (
          tabs.map((tab, index) => {
            return (
              <div onClick={() => {
                if (tab.onClick) tab.onClick();
                // eslint-disable-next-line react/no-array-index-key
              }} key={index} className={classNames(styles.tab, {
                [styles.tabActive]: tab.id === selectedTabId
              })}>
                {tab.text}
              </div>
            );
          })
        ) : null}
      </div>
      <div className={styles.controlsWrapper}>
        {actions}
        <div className={styles.closeButton} onClick={() => {
          if(onRequestClose) onRequestClose();
        }} title="close">
          <i className="fa fa-times" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
