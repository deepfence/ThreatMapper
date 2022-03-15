import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import styles from './common.module.scss';

export const ScanHeadingDetails = ({
  headingText,
  statusText,
  isError,
  headingControl
}) => {
  return (
    <div className={styles.headingDetails}>
      <div className={styles.headingContent}>
        <div className={styles.heading}>{headingText}</div>
        <div className={classNames(styles.status, {
          [styles.error]: isError
        })}>{statusText}</div>
      </div>
      {headingControl && (
        <div className={styles.headingControl}>
          {headingControl}
        </div>
      )}
    </div>
  );
}

export const ScanFormAccordian = ({ children, label }) => {
  const [isOpen, setIsOpen] = useState(!label);

  useEffect(() => {
    setIsOpen(!label);
  }, [label]);

  return (
    <div className={styles.accordianWrapper}>
      {
        label && <div
          className={styles.accordianHeader}
          onClick={() => setIsOpen(!isOpen)}
        >
          {
            isOpen
              ? <i className="fa fa-caret-down" aria-hidden="true" />
              : <i className="fa fa-caret-right" aria-hidden="true" />
          }
          {label}
        </div>
      }
      {
        isOpen && (
          <div className={styles.accordianContent}>
            {children}
          </div>
        )
      }
    </div>
  );
}

export const ScanWraper = ({ children }) => {
  return (
    <div className={styles.scanWrapper}>
      {children}
    </div>
  );
}

export const Devider = () => {
  return (
    <div className={styles.devider}>
      <hr />
    </div>
  )
};
