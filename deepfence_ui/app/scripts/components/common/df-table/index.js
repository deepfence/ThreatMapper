import React from 'react';
import 'react-table-6/react-table.css';
import ReactTable from 'react-table-6';
import { connect } from 'react-redux';
import classNames from 'classnames';
import PaginationComponent from './pagination';
import DFTriggerSelect from '../multi-select/app-trigger';
import {
  getTableColumnPreferenceAction,
  setTableColumnPreferenceAction,
} from '../../../actions/app-actions';
import './styles.scss';

const columnIdExtractor = column => column.id || column.accessor;

class DFTable extends React.PureComponent {
  constructor(props) {
    super(props);
    this.setColumnPreferences = this.setColumnPreferences.bind(this);
    this.getColumnPrefences = this.getColumnPrefences.bind(this);
    this.persistColumnPreferences = this.persistColumnPreferences.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.initializeColumnPreference =
      this.initializeColumnPreference.bind(this);
    this.state = {
      columnPreferences: props.visibleColumnIds,
    };
  }

  componentDidMount() {
    this.initializeColumnPreference();
    this.getColumnPrefences();
  }

  initializeColumnPreference(params = {}) {
    const visibleColumnIds =
      params.visibleColumnIds || this.props.visibleColumnIds || [];
    const columns = params.columns || this.props.columns;
    if (visibleColumnIds.length === 0) {
      const visibleColumns = columns
        .filter(el => el.hiddenOnDefault !== true)
        .map(el => ({ value: columnIdExtractor(el) }));
      this.setColumnPreferences(visibleColumns, null, {
        ...params,
        persist: true,
      });
    }
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    const {
      visibleColumnIds = [],
      columns: newColumns,
      name: newName,
    } = newProps;

    const newColumnHash = newColumns.map(columnIdExtractor).join(',');
    const currentColumnHash = this.props.columns
      .map(columnIdExtractor)
      .join(',');
    if (visibleColumnIds.length > 0) {
      if (visibleColumnIds !== this.props.visibleColumnIds) {
        this.setState({
          columnPreferences: newProps.visibleColumnIds,
        });
      }
    } else if (newColumnHash !== currentColumnHash) {
      this.initializeColumnPreference({
        columns: newColumns,
        name: newName,
        visibleColumnIds,
      });
    }
  }

  // Revert the state if user has not clicked the saved button but
  // closed the dialog by clicking outside.
  handleClose() {
    this.setState({
      columnPreferences: this.props.visibleColumnIds,
    });
  }

  // We have to maintain a local state because dynamically changing
  // columns, results in re-rendering of the HEADER ROW and the column preference dialog
  // is placed in the HEADER ROW, causing it to close the dialog on each click.
  // we redraw the HEADER ROW only when user clicks on the save button
  setColumnPreferences(values, selectAction, params = {}) {
    const columnPreferences = values.map(el => el.value);
    this.setState(
      {
        columnPreferences,
      },
      () => {
        if (params.persist === true) {
          this.persistColumnPreferences(params);
        }
      }
    );
  }

  persistColumnPreferences(params = {}) {
    const { setTableColumnPreferenceAction: setAction, columnCustomize } =
      this.props;

    if (!columnCustomize) {
      return;
    }

    const { columnPreferences: columnIds } = this.state;

    const name = params.name || this.props.name;

    /* eslint-disable no-console */
    if (!name) {
      console.error(
        this.props.columns,
        'DFTable requires a name if column customization is switched on'
      );
      return;
    }
    /* eslint-enable */

    setAction({
      tableName: name,
      columnIds,
    });
  }

  getColumnPrefences() {
    const { name, getTableColumnPreferenceAction: getAction } = this.props;
    return getAction({
      tableName: name,
    });
  }

  render() {
    const {
      data = [],
      columns,
      showPagination,
      defaultPageSize,
      visibleColumnIds = [],
      name,
      columnCustomize = false,
      columnCustomizeMinSelectedCount = 2,
      ...rest
    } = this.props;

    let initPageSize = -1;
    const showPaginationBottom = false;
    let showPaginationTop = false;
    let pageSize = data.length ? data.length : 2;
    if (data.length > 0) {
      if (showPagination) {
        showPaginationTop = true;
        initPageSize = defaultPageSize > 0 ? defaultPageSize : 10;
        pageSize = initPageSize;
      }
    }

    let visibleColumns = [...columns];
    if (columnCustomize && name && visibleColumnIds.length > 0) {
      visibleColumns = columns.filter(column => {
        const id = columnIdExtractor(column);
        if (column.isPositionFixed) {
          return true;
        }
        return visibleColumnIds.includes(id);
      });
    }

    if (columnCustomize) {
      const options = columns
        .filter(el => !el.isPositionFixed)
        .map(el => ({
          label: typeof el.Header === 'function' ? el.Header() : el.Header,
          value: columnIdExtractor(el),
        }));

      const { columnPreferences } = this.state;

      visibleColumns.push({
        Header: (
          <DFTriggerSelect
            options={options}
            menuAlignment="left"
            onChange={this.setColumnPreferences} // maintain local state, do not persist
            onSave={this.persistColumnPreferences} // persist only on save
            onClose={this.handleClose} // revert state is user didn't click save
            value={options.filter(option =>
              columnPreferences.includes(option.value)
            )}
            minSelectedCount={columnCustomizeMinSelectedCount}
          />
        ),
        accessor: () => { },
        id: '__menu',
        resizable: false,
        sortable: false,
        width: '10px',
        headerClassName: 'allow-overflow',
        className: 'invisible',
      });
    }

    return (
      <ReactTable
        className={classNames('df-table', {
          'no-data': !data?.length && initPageSize === -1
        })}
        columns={visibleColumns}
        data={data}
        showPaginationTop={showPaginationTop}
        showPaginationBottom={showPaginationBottom}
        showPageSizeOptions={false}
        defaultPageSize={initPageSize}
        pageSize={pageSize}
        PaginationComponent={PaginationComponent}
        {...rest}
      />
    );
  }
}

const mapStateToProps = (state, ownProps) => ({
  visibleColumnIds: state.getIn(['DFTablePreferences', ownProps.name], []),
});

export default connect(mapStateToProps, {
  getTableColumnPreferenceAction,
  setTableColumnPreferenceAction,
})(DFTable);
