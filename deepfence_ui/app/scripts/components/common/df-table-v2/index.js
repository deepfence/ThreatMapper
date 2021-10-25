/* eslint-disable no-nested-ternary */
import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';
import { useExpanded, useFlexLayout, usePagination, useResizeColumns, useSortBy, useTable } from 'react-table';
import Pagination from './pagination';
import DFTriggerSelect from '../multi-select/app-trigger';
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

function getPersistedHiddenColumnIds(name) {
  const strIds = localStorage.getItem(`${name}--tableColumnPreference-hiddenColumnIds`) || '[]';
  const ids = JSON.parse(strIds);
  return ids;
}

function setPersistedHiddenColumnIds(name, ids) {
  localStorage.setItem(`${name}--tableColumnPreference-hiddenColumnIds`, JSON.stringify(ids ?? []));
}

const columnIdExtractor = column => column.id || column.accessor;

function useColumnFilter({
  columnCustomizable,
  renderRowSubComponent,
  columns,
  name
}) {

  const [hiddenColumnIds, setHiddenColumnIds] = useState([]);
  const [dirtyHiddenColumnIds, setDirtyHiddenColumnIds] = useState([]);


  useEffect(() => {
    if (columnCustomizable && name) {
      setHiddenColumnIds(getPersistedHiddenColumnIds(name));
    } else if (columnCustomizable && !name) {
      console.warn('table name is not set! set table name to enable column customizations');
    }
  }, []);

  useEffect(() => {
    setDirtyHiddenColumnIds(hiddenColumnIds);
  }, [hiddenColumnIds]);

  const rtColumns = useMemo(() => {
    let visibleColumns = [...columns];

    if (columnCustomizable && name) {
      const options = visibleColumns
        .filter(col => !col.disableCustomization)
        .map(col => ({
          label: typeof col.Header === 'function' ? col.Header() : col.Header,
          value: columnIdExtractor(col),
        }));

      if (hiddenColumnIds.length) {
        visibleColumns = visibleColumns.filter((column) => {
          const id = columnIdExtractor(column);
          if (column.disableCustomization) {
            return true;
          }

          return !hiddenColumnIds.includes(id);
        })
      }

      visibleColumns.push({
        Header: (
          <DFTriggerSelect
            options={options}
            menuAlignment="left"
            onChange={(shownOptions) => {
              const newHiddenCols = options
                .filter((option) => !shownOptions.some((shownOption) => option.value === shownOption.value))
                .map((option) => option.value);
              setDirtyHiddenColumnIds(newHiddenCols);
            }}
            onSave={() => {
              setPersistedHiddenColumnIds(name, dirtyHiddenColumnIds);
              setHiddenColumnIds(dirtyHiddenColumnIds);
            }}
            onClose={() => {
              setDirtyHiddenColumnIds(hiddenColumnIds);
            }}
            value={options.filter(option =>
              !dirtyHiddenColumnIds.includes(option.value)
            )}
            minSelectedCount={2}
          />
        ),
        accessor: () => { },
        id: '__customizationMenu',
        disableResizing: true,
        disableSortBy: true,
        showOverflow: true,
        width: '20px',
      });
    }

    if (renderRowSubComponent) {
      visibleColumns.unshift({
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
    return visibleColumns;
  }, [hiddenColumnIds, dirtyHiddenColumnIds]);
  return rtColumns
};


/**
* Common Table component
* @param {Object} props
* @param {Object[]} props.columns - react-table columns config object
* @param {boolean} props.columns[].disableCustomization - disable customization for this column
* @param {Object[]} props.data - data is an array of row data objects
* @param {function} props.renderRowSubComponent - a function that returns an react node used as sub component for a row
* @param {boolean} props.showPagination - specifies pagination is shown or not
* @param {boolean} props.manual - whether the pagination, sorting etc are controlled via parent
* @param {number} props.totalRows - total number of rows in table, required when manual is true
* @param {number} props.page - current page, required when manual is true
* @param {number} props.defaultPageSize - defaults to 10 in case of pagination is shown, otherwise length of data
* @param {function} props.onPageChange - in case of manual true, this will be called to notify parent about change of a page
* @param {boolean} props.enableSorting - flag to enable sorting for the table
* @param {function} props.onSortChange - callback notifying parent about sort state changes
* @param {string} props.noDataText - no data text in case of an empty table
* @param {boolean} props.disableResizing - columns are resizable or not
* @param {boolean} props.columnCustomizable - columns are customizable or not
* @param {string} props.name - name of the table, used to save column customization preferences
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
  noDataText,
  disableResizing,
  columnCustomizable,
  name
}) => {

  defaultPageSize = getDefaultPageSize({
    showPagination,
    inputDefaultPageSize: defaultPageSize,
    data
  });

  const rtColumns = useColumnFilter({
    columns,
    columnCustomizable,
    renderRowSubComponent,
    name
  })

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
    useResizeColumns,
    useFlexLayout,
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
                    return <div className={classNames(styles.headerCell, {
                      [styles.headerOverflowShown]: !!column.showOverflow
                    })} key={key} {...rest}>
                      <span className={styles.headerContent} onClick={onClick}>
                        {column.render('Header')}
                        {
                          column.disableSortBy ? null : (
                            <span className={`${styles.sortIndicator} ${column.isSorted
                              ? column.isSortedDesc
                                ? 'fa fa-angle-up'
                                : 'fa fa-angle-down'
                              : ''
                              }`} />)
                        }
                      </span>
                      {column.canResize && !disableResizing ? (
                        <div
                          {...column.getResizerProps()}
                          className={styles.headerCellResizer}
                        />
                      ) : null}
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
