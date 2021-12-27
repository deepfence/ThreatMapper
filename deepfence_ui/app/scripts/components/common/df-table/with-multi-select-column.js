/* eslint-disable implicit-arrow-linebreak */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable no-unused-vars */
/* eslint max-len: ["error", { "code": 800}] */
import React, { useEffect } from 'react';
import { Map } from 'immutable';
import { connect } from 'react-redux';
import {
  setRowSelectionAction,
  resetSelectionAction,
  showModal,
} from '../../../actions/app-actions';
import { excludeKeys } from '../../../utils/array-utils';
import { isPromise, waitAsync } from '../../../utils/promise-utils';
import { getUserRole } from '../../../helpers/auth-helper';

const withMultiSelectColumn = columnConfig => WrappedComponent => {
  class HOC extends React.PureComponent {
    constructor(props) {
      super(props);
      this.toggleLogSelection = this.toggleLogSelection.bind(this);
      this.registerActions = this.registerActions.bind(this);
      this.resetSelection = this.resetSelection.bind(this);
      this.toggleAll = this.toggleAll.bind(this);
      this.state = {
        registeredActions: [],
        defaultActions: [
          {
            name: 'Toggle All',
            icon: <i className="fa fa-check-circle cursor" />,
            onClick: this.toggleAll,
          },
        ],
      };
    }

    toggleAll(selectedDocIndex = {}, allRows = []) {
      const { dispatch, multiSelectColumnState } = this.props;
      const {
        name,
        column: { accessor },
      } = columnConfig;
      let selectedRowIndex = multiSelectColumnState.getIn(
        [name, 'selectedRowIndex'],
        {}
      );
      if (Object.keys(selectedRowIndex).length === allRows.length) {
        selectedRowIndex = {};
      } else {
        selectedRowIndex = allRows.reduce((acc, row) => {
          acc[row[accessor]] = row;
          return acc;
        }, {});
      }
      return dispatch(setRowSelectionAction(name, selectedRowIndex));
    }

    toggleLogSelection(value, row) {
      const { dispatch, multiSelectColumnState = {} } = this.props;
      const { name } = columnConfig;
      let selectedRowIndex = multiSelectColumnState.getIn(
        [name, 'selectedRowIndex'],
        {}
      );

      if (selectedRowIndex[value]) {
        selectedRowIndex = excludeKeys(selectedRowIndex, [value]);
      } else {
        selectedRowIndex = {
          ...selectedRowIndex,
          [value]: row,
        };
      }
      dispatch(setRowSelectionAction(name, selectedRowIndex));
    }

    componentWillUnmount() {
      this.resetSelection();
    }

    registerActions(actionList) {
      this.setState({
        registeredActions: actionList,
      });
    }

    renderAction(param) {
      const { multiSelectColumnState, dispatch } = this.props;
      const { name } = columnConfig;
      const selectedRowIndex = multiSelectColumnState.getIn(
        [name, 'selectedRowIndex'],
        {}
      );
      const {
        name: actionName,
        icon,
        IconComponent,
        componentParams,
        onClick,
        postClickSuccess,
        postClickSuccessDelayInMs,
        showConfirmationDialog,
        confirmationDialogParams: {
          dialogTitle,
          dialogBody,
          confirmButtonText,
          cancelButtonText,
          contentStyles = {},
          additionalInputs = [],
        } = {},
        allRows,
      } = param;
      if (showConfirmationDialog) {
        return (
          <div
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
                  if (isPromise(onClickPromise)) {
                    onClickPromise.then(async () => {
                      this.resetSelection();
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
          />
        );
      }
      return (
        <div
          title={actionName}
          onClick={() => {
            const onClickPromise = onClick(selectedRowIndex, allRows);
            if (isPromise(onClickPromise)) {
              onClickPromise.then(() => {
                this.resetSelection();
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

    resetSelection() {
      const { name } = columnConfig;
      const { dispatch } = this.props;
      dispatch(resetSelectionAction(name));
    }

    render() {
      const { multiSelectColumnState, ...rest } = this.props;
      const {
        name,
        column: {
          name: columnName,
          accessor: columnAccessor,
          ...restColumnConfig
        } = {},
      } = columnConfig;
      const selectedRowIndex = multiSelectColumnState.getIn(
        [name, 'selectedRowIndex'],
        {}
      );
      const { registeredActions, defaultActions } = this.state;
      const allActions = [...registeredActions, ...defaultActions];
      const userRole = getUserRole();
      return (
        <WrappedComponent
          multiSelectColumnConfig={columnConfig}
          {...rest}
          registerActions={this.registerActions}
          resetSelection={this.resetSelection}
          multiSelectColumn={{
            Header: ({ data = [] } = {}) =>
              Object.keys(selectedRowIndex).length ? (
                <div className="action-control" style={{ zIndex: '10' }}>
                  {allActions
                    .filter(el =>
                      // making userRole optional. user role condition
                      // should satisfy only if its passed, else always true
                      el.userRole ? el.userRole === userRole : true
                    )
                    .map(actionParam =>
                      this.renderAction({
                        ...actionParam,
                        /* eslint-disable no-underscore-dangle */
                        allRows: data.map(el => el._original),
                        /* eslint-enable */
                      })
                    )}
                </div>
              ) : (
                <div className="center-text">{columnName}</div>
              ),
            accessor: row => row,
            id: 'df-multi-select-column',
            Cell: cell => (
              <div
                className="center-text"
                onClick={ev => ev.stopPropagation()}
                aria-hidden="true"
              >
                <input
                  type="checkbox"
                  value={cell.value[columnAccessor]}
                  checked={selectedRowIndex[cell.value[columnAccessor]]}
                  onChange={ev => {
                    this.toggleLogSelection(ev.target.value, cell.value);
                  }}
                />
              </div>
            ),
            isPositionFixed: true, // do not allow user customization on this column
            sortable: false,
            resizable: false,
            show: registeredActions.length > 0,
            headerClassName: 'allow-overflow',
            ...restColumnConfig,
          }}
        />
      );
    }
  }
  function mapStateToProps(state) {
    return {
      multiSelectColumnState: state.get('df_table_multi_select_column'),
    };
  }
  return connect(mapStateToProps)(HOC);
};

export default withMultiSelectColumn;
