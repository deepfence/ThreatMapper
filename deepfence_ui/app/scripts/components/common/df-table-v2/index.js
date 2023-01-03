/* eslint-disable no-nested-ternary */
import classNames from 'classnames';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useExpanded, useFlexLayout, usePagination, useResizeColumns, useSortBy, useTable, useRowSelect } from 'react-table';
import { useDispatch } from 'react-redux';
import usePrevious from 'react-use/lib/usePrevious';
import Pagination from './pagination';
import DFTriggerSelect from '../multi-select/app-trigger';
import AppLoader from '../../loader';
import { getUserRole } from '../../../helpers/auth-helper';
import { isPromise, waitAsync } from '../../../utils/promise-utils';
import { showModal } from '../../../actions/app-actions';
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
  hideExpander,
  columns,
  name,
  multiSelectOptions
}) {

  columns = columns.filter((column) => {
    if (typeof column.show === 'boolean') return column.show;
    return true;
  });

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

    if (multiSelectOptions) {
      visibleColumns.push({
        Header: () => 'Action',
        id: 'df-multi-select-column',
        Cell: ({ row }) => {
          const { indeterminate: _, ...toggleRowSelectedProps } = row.getToggleRowSelectedProps();
          return (
            <div
              className="center-text"
              onClick={ev => ev.stopPropagation()}
              aria-hidden="true"
            >
              <input
                type="checkbox"
                {...toggleRowSelectedProps}
              />
            </div>
          );
        },
        disableCustomization: true,
        width: 100,
        disableResizing: true,
        disableSortBy: true,
      });
    }

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
        width: 20,
      });
    }

    if (renderRowSubComponent && !hideExpander) {
      visibleColumns.unshift({
        Header: ({ getToggleAllRowsExpandedProps, isAllRowsExpanded }) => (
          <span className={styles.expanderCell} {...getToggleAllRowsExpandedProps()}>
            {isAllRowsExpanded ? <span className="fa fa-minus" /> : <span className="fa fa-plus" />}
          </span>
        ),
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
* @param {boolean} props.columns[].noWrap - disable text overflow truncation for this column
* @param {boolean} props.columns[].show - set false if don't want to show the column by default
* @param {Object[]} props.data - data is an array of row data objects
* @param {function} props.renderRowSubComponent - a function that returns an react node used as sub component for a row
* @param {boolean} props.hideExpander - hides expander row
* @param {boolean} props.showPagination - specifies pagination is shown or not
* @param {boolean} props.manual - whether the pagination, sorting etc are controlled via parent
* @param {number} props.totalRows - total number of rows in table, required when manual is true
* @param {number} props.page - current page, required when manual is true
* @param {number} props.defaultPageSize - defaults to 10 in case of pagination is shown, otherwise length of data
* @param {function} props.onPageChange - in case of manual true, this will be called to notify parent about change of a page
* @param {boolean} props.enableSorting - flag to enable sorting for the table
* @param {function} props.onSortChange - callback notifying parent about sort state changes
* @param {function} props.onRowClick - callback to be called on clicking of a row
* @param {function} props.onCellClick - callback to be called on clicking of a cell
* @param {function} props.getCellStyle - callback to get style for cell
* @param {function} props.getRowStyle - callback to get style for row
* @param {string} props.noDataText - no data text in case of an empty table
* @param {boolean} props.disableResizing - columns are resizable or not
* @param {boolean} props.columnCustomizable - columns are customizable or not
* @param {string} props.name - name of the table, used to save column customization preferences
* @param {boolean} props.loading - show loader
* @param {boolean} props.noMargin - no margin on left and right
* @param {Object} props.multiSelectOptions - options for multi select, pass undefined if row selection is not needed
* @param {Object[]} props.multiSelectOptions.actions - actions for multi select
* @param {Object[]} props.multiSelectOptions.columnConfig - column config for multi select
* @param {Object[]} props.multiSelectOptions.columnConfig.accessor - accessor property name for selection
*/
const DfTableV2 = forwardRef(({
  columns,
  data,
  renderRowSubComponent,
  hideExpander,
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
  name,
  loading,
  noMargin,
  multiSelectOptions,
  onRowClick,
  onCellClick,
  getRowStyle,
  getCellStyle,
}, ref) => {
  defaultPageSize = getDefaultPageSize({
    showPagination,
    inputDefaultPageSize: defaultPageSize,
    data
  });

  const rtColumns = useColumnFilter({
    columns,
    columnCustomizable,
    renderRowSubComponent,
    hideExpander,
    name,
    multiSelectOptions,
  });

  const defaultColumn = React.useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 30, // minWidth is only used as a limit for resizing
      width: 100, // width is used for both the flex-basis and flex-grow
      maxWidth: 500, // maxWidth is only used as a limit for resizing
    }),
    []
  )

  const additionalTableParams = {};

  if (manual) {
    additionalTableParams.pageCount = getPageCount({
      manual,
      showPagination,
      defaultPageSize,
      totalRows,
      data
    });
  } else if (showPagination) {
    additionalTableParams.initialState = {
      pageSize: defaultPageSize
    };
  }

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
      autoResetSelectedRows: false,
      ...additionalTableParams
    },
    useResizeColumns,
    useFlexLayout,
    useSortBy,
    useExpanded,
    usePagination,
    useRowSelect
  );
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    visibleColumns,
    page: rtPage,
    gotoPage,
    pageCount,
    state: {
      pageIndex,
      sortBy,
    },
    toggleAllRowsExpanded,
    setPageSize,
    toggleAllPageRowsSelected,
    selectedFlatRows
  } = tableInstance;

  useEffect(() => {
    // in case of manual pagination, parent should be passing current page number
    if (manual && page !== null && page !== undefined) gotoPage(page);
  }, [page]);

  useEffect(() => {
    // whenever pageIndex changes, existing expanded rows should be collapsed
    // all rows are deselected
    toggleAllRowsExpanded(false);
    toggleAllPageRowsSelected(false);
  }, [pageIndex]);

  useEffect(() => {
    // reset page index to 0 when number of rows shown in the page changes
    gotoPage(0);
  }, [defaultPageSize]);

  useEffect(() => {
    if (defaultPageSize !== data.length) {
      setPageSize(defaultPageSize);
    }
  }, [defaultPageSize, data]);

  const prevSortBy = usePrevious(sortBy);
  useEffect(() => {
    // for some reason sortBy is initially undefined and then it gets
    // set to empty array causing callback in the parent to be called
    // twice on initial render
    if (manual && onSortChange && prevSortBy) onSortChange(sortBy);
  }, [sortBy]);

  useImperativeHandle(ref, () => {
    return {
      resetPageIndex: () => {
        gotoPage(0);
      }
    }
  })

  return (
    <div className={styles.tableContainer}>
      <div className={classNames(styles.table, {
        [styles.noMargin]: noMargin
      })} {...getTableProps()}>
        {
          loading ? <AppLoader small className={styles.loader} /> : <>
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
                            <span>
                              {column.render('Header')}
                            </span>
                            <span className={`${styles.sortIndicator}`}>
                              {
                                column.isSorted
                                  ? column.isSortedDesc
                                    ? <i className="fa fa-angle-down" />
                                    : <i className="fa fa-angle-up" />
                                  : null
                              }
                            </span>
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
                  const { key, style, ...rest } = row.getRowProps();
                  return (
                    <React.Fragment key={key} >
                      <div
                        className={classNames(styles.row, {
                          [styles.oddRow]: index % 2 !== 0,
                          [styles.expandableRow]: !!renderRowSubComponent,
                          [styles.clickableRow]: !!onRowClick
                        })}
                        onClick={() => {
                          if (renderRowSubComponent) {
                            row.toggleRowExpanded();
                          } else if (onRowClick) {
                            onRowClick(row);
                          }
                        }}
                        style={{ ...(getRowStyle ? getRowStyle(row) : {}), ...style }}
                        {...rest}
                      >
                        {
                          row.cells.map(cell => {
                            const { key, style, ...rest } = cell.getCellProps();
                            const { column } = cell;
                            return (
                              <div
                                className={classNames(styles.cell, {
                                  [styles.wrap]: !column.noWrap
                                })}
                                key={key}
                                onClick={() => {
                                  if (onCellClick) {
                                    onCellClick(cell);
                                  }
                                }}
                                style={{ ...(getCellStyle ? getCellStyle(cell) : {}), ...style }}
                                {...rest}>
                                {
                                  cell.render('Cell')
                                }
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
          </>
        }
        {
          !data.length && !loading ? (
            <div className={styles.noDataPlaceholder}>
              {noDataText || 'No rows found'}
            </div>
          ) : null
        }
      </div>
      {
        showPagination && data.length && !loading ? (
          <div className={styles.paginationWrapper}>
            <Pagination
              pageCount={pageCount}
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
      {(multiSelectOptions && selectedFlatRows.length) ? (<div className={styles.multiSelectActions}>
        <MultiselectActions
          toggleAllPageRowsSelected={toggleAllPageRowsSelected}
          selectedFlatRows={selectedFlatRows ?? []}
          multiSelectOptions={multiSelectOptions}
          data={data}
        />
      </div>) : null}
    </div>
  );
});

function MultiselectActions({
  toggleAllPageRowsSelected,
  selectedFlatRows,
  multiSelectOptions,
  data
}) {
  const { columnConfig, actions = [] } = multiSelectOptions;
  const { accessor } = columnConfig;
  const defaultActions = [{
    name: 'Toggle All',
    icon: <i className={classNames(styles.actionIcon, "fa fa-check-circle cursor")} />,
    onClick: () => { toggleAllPageRowsSelected() },
  }];
  const allActions = [...actions, ...defaultActions];
  const userRole = getUserRole();

  const [selectedRowIndex, setSelectedRowIndex] = useState({});

  useEffect(() => {
    const newIdx = {};
    selectedFlatRows.forEach((row) => {
      newIdx[row.original[accessor]] = row.original;
    });
    setSelectedRowIndex(newIdx);
  }, [selectedFlatRows]);
  return allActions
    .filter(el => el.userRole ? el.userRole === userRole : true)
    .map((actionParam, index) =>
      <Action
        key={actionParam.name || index}
        {...actionParam}
        allRows={data}
        selectedRowIndex={selectedRowIndex}
        toggleAllPageRowsSelected={toggleAllPageRowsSelected}
      />
    );
}

function Action(props) {
  const dispatch = useDispatch();
  const {
    name: actionName,
    icon,
    IconComponent,
    componentParams,
    onClick,
    postClickSuccess,
    showConfirmationDialog,
    postClickSuccessDelayInMs,
    confirmationDialogParams: {
      dialogTitle,
      dialogBody,
      confirmButtonText,
      cancelButtonText,
      contentStyles = {},
      additionalInputs = [],
    } = {},
    allRows,
    selectedRowIndex,
    toggleAllPageRowsSelected
  } = props;
  if (showConfirmationDialog) {
    return (
      <div
        className={styles.actionItem}
        title={actionName}
        onClick={() => {
          const modalParams = {
            dialogTitle,
            dialogBody,
            confirmButtonText,
            cancelButtonText,
            contentStyles,
            additionalInputs,
            onConfirmButtonClick: additionalParams => {
              const onClickPromise = onClick(
                selectedRowIndex,
                allRows,
                additionalParams
              );
              if (onClickPromise && isPromise(onClickPromise)) {
                onClickPromise.then(async () => {
                  toggleAllPageRowsSelected(false);
                  await waitAsync(postClickSuccessDelayInMs);
                  if (typeof postClickSuccess === 'function') {
                    postClickSuccess(selectedRowIndex);
                  }
                });
              }
              return onClickPromise;
            },
          };
          dispatch(showModal('DIALOG_MODAL', modalParams));
        }}
      >
        {icon}
      </div>
    );
  }
  if (IconComponent) {
    return (
      <IconComponent
        {...componentParams}
        selectedObjectIndex={selectedRowIndex}
        className={styles.actionItem}
      />
    );
  }
  return (
    <div
      title={actionName}
      className={styles.actionItem}
      onClick={() => {
        const onClickPromise = onClick(selectedRowIndex, allRows);
        if (onClickPromise && isPromise(onClickPromise)) {
          onClickPromise.then(() => {
            toggleAllPageRowsSelected(false);
            if (typeof postClickSuccess === 'function') {
              postClickSuccess();
            }
          });
        }
        return onClickPromise;
      }}
      aria-hidden="true"
    >
      {icon}
    </div>
  );
}

export { DfTableV2 };
