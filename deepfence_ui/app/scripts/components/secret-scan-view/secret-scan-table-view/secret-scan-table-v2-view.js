import React from 'react';
import { connect } from 'react-redux';
import { formValueSelector } from 'redux-form/immutable';

import MaskForm from './mask-form';
import { nodeFilterValueSelector } from '../../../selectors/node-filters';
import { DfTableV2 } from '../../common/df-table-v2';
import pollable from '../../common/header-view/pollable';
import {
  getSecretScanResultsAction,
  secretScanMaskDocsAction,
  secretScanUnmaskDocsAction,
  deleteDocsByIdAction,
  requestManualAlertNotification,
} from '../../../actions/app-actions';
import { SecretScanModal } from '../secret-scan-modal';

class SecretScanTableV2 extends React.Component {
  constructor(props) {
    super(props);
    this.getSecrets = this.getSecrets.bind(this);
    this.tableChangeHandler = this.tableChangeHandler.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handleRowClick = this.handleRowClick.bind(this);
    this.deleteDocs = this.deleteDocs.bind(this);
    this.unmaskDocs = this.unmaskDocs.bind(this);
    this.maskDocs = this.maskDocs.bind(this);
    this.state = {
      isSecretsModalOpen: false,
      secretsData: null,
    };
  }

  handleRowClick(rowInfo) {
    const { original: row } = rowInfo;
    const modalData = {
      _source: {
        ...row,
      },
      _id: row.doc_id,
      _type: row.type,
    };
    this.setState({
      isSecretsModalOpen: true,
      secretsData: modalData,
    });
  }

  tableChangeHandler(params = {}) {
    // pollable: on any change in the DF Table params, update the polling params,
    // which will update and restart polling with new params.
    const { updatePollParams } = this.props;
    updatePollParams(params);
  }

  handlePageChange(pageNumber) {
    this.tableChangeHandler({
      page: pageNumber,
    });
  }

  deleteDocs(selectedDocIndex = {}) {
    const paramList = Object.keys(selectedDocIndex).map(key => ({
      _id: selectedDocIndex[key]._id,
      _index: selectedDocIndex[key]._index,
    }));
    const params = paramList.reduce(
      (acc, param) => {
        acc.index_name = param._index;
        acc.ids = [...acc.ids, param._id];
        return acc;
      },
      { ids: [] }
    );

    const { deleteDocsByIdAction: action } = this.props;
    return action(params);
  }

  unmaskDocs(selectedDocIndex = {}) {
    const value = {};
    Object.keys(selectedDocIndex).forEach(key => {
      value[key] = selectedDocIndex[key]._id;
    });
    const idValue = Object.keys(value).map(key => value[key]);

    const { secretScanUnmaskDocsAction: action } = this.props;
    return action({ docs: idValue });
  }

  maskDocs(selectedDocIndex = {}) {
    const value = {};
    Object.keys(selectedDocIndex).forEach(key => {
      value[key] = selectedDocIndex[key]._id;
    });
    const idValue = Object.keys(value).map(key => value[key]);

    const { secretScanMaskDocsAction: action } = this.props;
    return action({
      docs: idValue,
    });
  }

  componentDidMount() {
    const { registerPolling } = this.props;
    registerPolling(this.getSecrets);
  }

  componentDidUpdate(oldProps) {
    const newProps = this.props;
    const options = {};
    if (
      newProps.filterValues &&
      oldProps.filterValues !== newProps.filterValues
    ) {
      options.filters = newProps.filterValues;
    }
    if (newProps.hideMasked !== oldProps.hideMasked) {
      options.hideMasked = newProps.hideMasked;
    }
    if (Object.keys(options).length > 0) {
      this.getSecrets(options);
    }
  }

  getSecrets(params) {
    const { getSecretScanResultsAction: action, filterValues = {} } =
      this.props;

    const hideMasked = params.hideMasked || this.props.hideMasked;

    const {
      page = 0,
      pageSize = 20,
      globalSearchQuery,
      alertPanelHistoryBound = this.props.alertPanelHistoryBound || {},
    } = params;

    const tableFilters = params.filters || filterValues;
    const nonEmptyFilters = Object.keys(tableFilters)
      .filter(key => tableFilters[key].length)
      .reduce((acc, key) => {
        // replacing back the dot which was removed redux-form as it considers that a nested field.
        acc[[key.replace('-', '.')]] = tableFilters[key];
        return acc;
      }, {});

    const {
      masked,
      ...nodeFilters // apart from masked, all the node_type filters
    } = nonEmptyFilters;

    // once filters are implemented, hideMasked can be removed.
    const toggleMaskFilter = masked || hideMasked;
    const filters = {
      ...(toggleMaskFilter ? { masked: false } : {}),
      scan_id: this.props.scanId,
    };

    const apiParams = {
      lucene_query: globalSearchQuery,
      // Conditionally adding number and time_unit fields
      ...(alertPanelHistoryBound.value
        ? { number: alertPanelHistoryBound.value.number }
        : {}),
      ...(alertPanelHistoryBound.value
        ? { time_unit: alertPanelHistoryBound.value.time_unit }
        : {}),
      filters,
      start_index: page ? page * pageSize : page,
      node_filters: nodeFilters,
      size: pageSize,
    };
    return action(apiParams);
  }

  render() {
    const { secretScanResults = [], total, updatePollParams } = this.props;

    const columns = [
      {
        Header: 'Id',
        accessor: '_id',
        Cell: row => (
          <div className="truncate" title={row.value}>
            {row.value}
          </div>
        ),
        width: 100,
      },
      {
        Header: 'Filename',
        accessor: '_source.Match.full_filename',
        Cell: row => (
          <div className="truncate" title={row.value}>
            {row.value}
          </div>
        ),
        width: 100,
      },
      {
        Header: 'Matched content',
        accessor: '_source.Match.matched_content',
        Cell: row => (
          <div className="truncate" title={row.value}>
            {row.value}
          </div>
        ),
        width: 100,
      },
      {
        Header: 'Severity',
        accessor: '_source.Severity.level',
        Cell: cell => (
          <div className={`${cell.value}-severity`}>{cell.value}</div>
        ),
        width: 90,
      },
      {
        Header: 'Rule name',
        accessor: '_source.Rule.name',
        Cell: row => (
          <div className="truncate" title={row.value}>
            {row.value}
          </div>
        ),
        minWidth: 100,
        width: 150,
      },
      {
        Header: 'Signature to match',
        accessor: '_source.Rule.signature_to_match',
        Cell: row => (
          <div className="truncate" title={row.value}>
            {row.value}
          </div>
        ),
        minWidth: 100,
        width: 300,
      },
    ];

    return (
      <div className="alert-table-view">
        <div className="mask-filter vulnerability-filter">
          <MaskForm />
        </div>

        {secretScanResults && (
          <DfTableV2
            className="truncate"
            columns={columns}
            showPagination
            defaultPageSize={20}
            totalRows={total}
            name="secrets-scan-details-table"
            manual
            data={secretScanResults}
            getRowStyle={row => ({
              opacity: row.original._source.masked === 'true' ? 0.5 : 1,
            })}
            onRowClick={row => this.handleRowClick(row)}
            columnCustomizable
            onPageChange={this.handlePageChange}
            multiSelectOptions={{
              actions: [
                {
                  name: 'mask',
                  userRole: 'admin',
                  icon: <i className="fa fa-eye-slash cursor" />,
                  onClick: this.maskDocs,
                  postClickSuccess: updatePollParams,
                  showConfirmationDialog: true,
                  confirmationDialogParams: {
                    dialogTitle: 'Mask these records?',
                    dialogBody:
                      'Are you sure you want to mask the selected records?',
                    confirmButtonText: 'Yes, mask',
                    cancelButtonText: 'No, Keep',
                  },
                },
                {
                  name: 'Unmask',
                  userRole: 'admin',
                  icon: <i className="fa fa-eye cursor" />,
                  onClick: this.unmaskDocs,
                  postClickSuccess: updatePollParams,
                  showConfirmationDialog: true,
                  confirmationDialogParams: {
                    dialogTitle: 'Unmask these records?',
                    dialogBody:
                      'Are you sure you want to unmask the selected records?',
                    confirmButtonText: 'Yes, Unmask',
                    cancelButtonText: 'No, Keep',
                  },
                },
                {
                  name: 'Delete',
                  icon: <i className="fa fa-trash-o red cursor" />,
                  onClick: this.deleteDocs,
                  postClickSuccessTODO: this.removeDocs,
                  postClickSuccess: updatePollParams,
                  showConfirmationDialog: true,
                  postClickSuccessDelayInMs: 2000,
                  confirmationDialogParams: {
                    dialogTitle: 'Delete these records?',
                    dialogBody:
                      'Are you sure you want to Delete the selected records?',
                    confirmButtonText: 'Yes, Delete',
                    cancelButtonText: 'No, Keep',
                  },
                },
              ],
              columnConfig: {
                accessor: '_id',
              },
            }}
          />
        )}
        {this.state.isSecretsModalOpen && this.state.secretsData ? (
          <SecretScanModal
            data={this.state.secretsData}
            onRequestClose={() => {
              this.setState({
                isSecretsModalOpen: false,
                secretsData: null,
              });
            }}
          />
        ) : null}
      </div>
    );
  }
}

const maskFormSelector = formValueSelector('secrets-mask-form');
function mapStateToProps(state) {
  return {
    secretScanResults: state.getIn(['secretScanResults', 'data']),
    total: state.getIn(['secretScanResults', 'total']),
    filterValues: nodeFilterValueSelector(state),
    hideMasked: maskFormSelector(state, 'hideMasked'),
    maskDocs: state.getIn([
      'form',
      'dialogConfirmation',
      'values',
      'masking_docs',
    ]),
  };
}

const connectedTable = connect(mapStateToProps, {
  getSecretScanResultsAction,
  secretScanMaskDocsAction,
  secretScanUnmaskDocsAction,
  deleteDocsByIdAction,
  requestManualAlertNotification,
})(SecretScanTableV2);

export default pollable()(connectedTable);
