/* eslint-disable no-nested-ternary */
import classNames from 'classnames';
import React, { useEffect, useMemo } from 'react';
import { useExpanded, useFlexLayout, usePagination, useResizeColumns, useSortBy, useTable } from 'react-table';
import Pagination from './pagination';
import styles from "./index.module.scss";

function getPageCount({
  manual,
  showPagination,
  totalRows,
  defaultPageSize,
  data
}) {
  const pageCount = showPagination ? (manual ? Math.ceil(totalRows / defaultPageSize) : Math.ceil(data.length / defaultPageSize)) : 0;
  return pageCount;
}

function getDefaultPageSize({ showPagination, inputDefaultPageSize, data }) {
  // if we are not showing pagination then all the rows should
  // be shown in single page with pagination hidden
  return showPagination ? (inputDefaultPageSize ?? 10) : data.length;
}

/**
* Common Table component
* @param  props
* @param  props.columns - react-table columns config object
* @param  props.data - data is an array of row data objects
* @param  props.renderRowSubComponent - a function that returns an react node used as sub component for a row
* @param  props.showPagination - specifies pagination is shown or not
* @param  props.manual - whether the pagination, sorting etc are controlled via parent
* @param  props.totalRows - total number of rows in table, required when manual is true
* @param  props.page - current page, required when manual is true
* @param  props.defaultPageSize - defaults to 10 in case of pagination is shown, otherwise length of data
* @param  props.onPageChange - in case of manual true, this will be called to notify parent about change of a page
* @param  props.enableSorting - flag to enable sorting for the table
* @param  props.onSortChange - callback notifying parent about sort state changes
* @param  props.noDataText - no data text in case of an empty table
*/
const DfTableV2 = ({
  columns,
  data,
  renderRowSubComponent,
  showPagination,
  manual,
  totalRows,
  page,
  defaultPageSize,
  onPageChange,
  enableSorting,
  onSortChange,
  noDataText
}) => {

  defaultPageSize = getDefaultPageSize({
    showPagination,
    inputDefaultPageSize: defaultPageSize,
    data
  });

  const rtColumns = useMemo(() => {
    const rtColumns = [...columns];
    if (renderRowSubComponent) {
      rtColumns.unshift({
        Header: () => null,
        id: 'expander',
        Cell: ({ row }) => (
          <span className={styles.expanderCell}>
            {row.isExpanded ? <span className="fa fa-minus" /> : <span className="fa fa-plus" />}
          </span>
        ),
        width: 35,
        disableResizing: true
      })
    };
    return rtColumns;
  }, []);

  const defaultColumn = React.useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 30, // minWidth is only used as a limit for resizing
      width: 150, // width is used for both the flex-basis and flex-grow
      maxWidth: 200, // maxWidth is only used as a limit for resizing
    }),
    []
  )

  const tableInstance = useTable(
    {
      columns: rtColumns,
      data,
      defaultColumn,
      autoResetExpanded: false,
      autoResetPage: false,
      manualPagination: !!manual,
      paginateExpandedRows: false,
      disableSortBy: !enableSorting,
      manualSortBy: !!manual,
      autoResetSortBy: false,
      disableMultiSort: true,
      initialState: {
        pageIndex: 0,
        pageSize: defaultPageSize
      },
      pageCount: getPageCount({
        manual,
        showPagination,
        defaultPageSize,
        totalRows,
        data
      })
    },
    useFlexLayout,
    useResizeColumns,
    useSortBy,
    useExpanded,
    usePagination,
  );
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    visibleColumns,
    page: rtPage,
    gotoPage,
    state: {
      pageIndex,
      sortBy,
    },
    toggleAllRowsExpanded
  } = tableInstance;

  useEffect(() => {
    // in case of manual pagination, parent should be passing current page number
    if (manual && page !== null && page !== undefined) gotoPage(page);
  }, [page]);

  useEffect(() => {
    // whenever pageIndex changes, existing expanded rows should be collapsed
    toggleAllRowsExpanded(false);
  }, [pageIndex]);

  useEffect(() => {
    // reset page index to 0 when number of rows shown in the page changes
    gotoPage(0);
  }, [defaultPageSize]);

  useEffect(() => {
    if (manual && onSortChange) onSortChange(sortBy);
  }, [sortBy]);

  return (
    <div>
      <div className={styles.table} {...getTableProps()}>
        <div>
          {
            headerGroups.map(headerGroup => {
              const { key, ...rest } = headerGroup.getHeaderGroupProps();
              return <div key={key} {...rest}>
                {
                  headerGroup.headers.map(column => {
                    const { key, onClick, ...rest } = column.getHeaderProps(enableSorting ? column.getSortByToggleProps() : undefined);
                    return <div className={styles.headerCell} key={key} {...rest}>
                      <span className={styles.headerContent} onClick={onClick}>
                        {column.render('Header')}
                        <span className={`${styles.sortIndicator} ${column.isSorted
                          ? column.isSortedDesc
                            ? 'fa fa-angle-up'
                            : 'fa fa-angle-down'
                          : ''
                          }`} />
                      </span>
                      {column.canResize && (
                        <div
                          {...column.getResizerProps()}
                          className={styles.headerCellResizer}
                        />
                      )}
                    </div>
                  })}
              </div>
            })}
        </div>
        <div {...getTableBodyProps()}>
          {
            rtPage.map((row, index) => {
              prepareRow(row);
              const { key, ...rest } = row.getRowProps();
              return (
                <React.Fragment key={key} >
                  <div
                    className={classNames(styles.row, {
                      [styles.oddRow]: index % 2 !== 0,
                      [styles.expandableRow]: !!renderRowSubComponent
                    })}
                    onClick={() => {
                      if (renderRowSubComponent) {
                        row.toggleRowExpanded();
                      }
                    }}
                    {...rest}
                  >
                    {
                      row.cells.map(cell => {
                        const { key, ...rest } = cell.getCellProps();
                        return (
                          <div className={styles.cell} key={key} {...rest}>
                            {
                              cell.render('Cell')}
                          </div>
                        )
                      })
                    }
                  </div>
                  {
                    row.isExpanded ? (
                      <div>
                        <div colSpan={visibleColumns.length}>
                          {renderRowSubComponent({ row })}
                        </div>
                      </div>
                    ) : null
                  }
                </React.Fragment>
              )
            })}
        </div>
        {
          !data.length ? (
            <div className={styles.noDataPlaceholder}>
              {noDataText || 'No rows found'}
            </div>
          ) : null
        }
      </div>
      {
        showPagination && data.length ? (
          <div className={styles.paginationWrapper}>
            <Pagination
              pageCount={getPageCount({
                manual,
                showPagination,
                defaultPageSize,
                totalRows,
                data
              })}
              pageIndex={pageIndex}
              onPageChange={(selectedIndex) => {
                if (manual && onPageChange) {
                  onPageChange(selectedIndex);
                }
                if (!manual) {
                  gotoPage(selectedIndex);
                }
              }}
            />
          </div>
        ) : null
      }
    </div>
  );
};

export { DfTableV2 };
