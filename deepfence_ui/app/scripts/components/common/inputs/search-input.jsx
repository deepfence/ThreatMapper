import classNames from 'classnames';
import React from 'react';
import styles from './search-input.module.scss';

export const SearchInput = props => {
  return <input
    type="text"
    {...props}
    className={classNames(styles.searchInput, props.className)}
  />;
};
