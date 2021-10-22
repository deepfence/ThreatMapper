import React, { useCallback } from 'react';
import ReactPaginate from 'react-paginate';
import styles from './pagination.module.scss';

export default ({
  pageCount,
  pageIndex,
  onPageChange
}) => {
  const _onPageChange = useCallback((data) => {
    if (onPageChange) onPageChange(data.selected);
  }, [onPageChange]);

  return (
    <ReactPaginate
      containerClassName={styles.pagination}
      previousClassName={styles.previous}
      nextClassName={styles.next}
      activeClassName={styles.selected}
      previousLabel="Previous"
      nextLabel="Next"
      pageCount={pageCount}
      marginPagesDisplayed={2}
      pageRangeDisplayed={2}
      onPageChange={_onPageChange}
      forcePage={pageIndex}
    />
  );
};
