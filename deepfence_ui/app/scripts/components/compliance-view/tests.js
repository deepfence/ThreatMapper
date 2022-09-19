import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import {
  complianceMaskDocsAction,
  complianceTestRemoveAction,
  requestManualAlertNotification,
  complianceUnmaskDocsAction,
  deleteDocsByIdAction,
  getScanResultsAction,
  setSearchQuery,
} from '../../actions/app-actions';
import { dateTimeFormat } from '../../utils/time-utils';
import pollable from '../common/header-view/pollable';
import { ComplianceTestModal } from './test-modal';
import { DfTableV2 } from '../common/df-table-v2';

class ComplianceTests extends React.PureComponent {
  constructor(props) {
    super(props);
    this.getComplianceTest = this.getComplianceTest.bind(this);
    this.handleDescClick = this.handleDescClick.bind(this);
    this.tableChangeHandler = this.tableChangeHandler.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.unmaskDocs = this.unmaskDocs.bind(this);
    this.maskDocs = this.maskDocs.bind(this);
    this.removeDocs = this.removeDocs.bind(this);
    this.alertDocs = this.alertDocs.bind(this);
    this.deleteDocs = this.deleteDocs.bind(this);
    this.state = {
      testData: null,
      isTestModalOpen: false,
      page: 0,
    };
    this.multiSelectOptions = [
      {
        name: 'Mask',
        userRole: 'admin',
        icon: <i className="fa fa-eye-slash red cursor" />,
        onClick: this.maskDocs,
        postClickSuccess: props.updatePollParams,
        showConfirmationDialog: true,
        confirmationDialogParams: {
          dialogTitle: 'Mask these records?',
          dialogBody: 'Are you sure you want to mask the selected records?',
          confirmButtonText: 'Yes, Mask',
          cancelButtonText: 'No, Keep',
          contentStyles: {
            height: '230px',
          },
        },
      },
      {
        name: 'Unmask',
        userRole: 'admin',
        icon: <i className="fa fa-eye cursor" />,
        onClick: this.unmaskDocs,
        postClickSuccess: props.updatePollParams,
        showConfirmationDialog: true,
        confirmationDialogParams: {
          dialogTitle: 'Unmask these records?',
          dialogBody: 'Are you sure you want to unmask the selected records?',
          confirmButtonText: 'Yes, Unmask',
          cancelButtonText: 'No, Keep',
        },
      },
      {
        name: 'Delete',
        userRole: 'admin',
        icon: <i className="fa fa-trash-o red cursor" />,
        onClick: this.deleteDocs,
        postClickSuccess: this.removeDocs,
        showConfirmationDialog: true,
        confirmationDialogParams: {
          dialogTitle: 'Delete these records?',
          dialogBody: 'Are you sure you want to Delete the selected records?',
          confirmButtonText: 'Yes, Delete',
          cancelButtonText: 'No, Keep',
        },
      },
    ];
  }

  componentDidMount() {
    // pollable: register the function which needs to be polled
    // we don't have to explicitly start the polling here, as the DFTable
    // calls the updatePollParams which starts the polling.
    const { registerPolling, startPolling } = this.props;

    registerPolling(this.getComplianceTest);
    startPolling();
  }

  componentWillUnmount() {
    // pollable: stop polling on unmount
    const { stopPolling } = this.props;
    stopPolling();
    this.props.dispatch(setSearchQuery({ searchQuery: [] }));
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    if (this.props.hideMasked !== newProps.hideMasked) {
      this.getComplianceTest({
        hideMasked: newProps.hideMasked,
      });
    }
  }

  maskDocs(selectedDocIndex = {}) {
    const selectedDocIndexValues = Object.keys(selectedDocIndex);
    const { cloudType } = this.props;
    const { dispatch } = this.props;
    return dispatch(
      complianceMaskDocsAction({ cloudType, selectedDocIndexValues })
    );
  }

  removeDocs(selectedDocIndex = {}) {
    const forRemoval = Object.keys(selectedDocIndex).reduce(
      (acc, key) => {
        acc = {
          ...acc,
          checkType: selectedDocIndex[key].compliance_check_type,
          nodeId: selectedDocIndex[key].node_id,
          idList: [
            ...acc.idList,
            /* eslint-disable no-underscore-dangle */
            selectedDocIndex[key]._id,
            /* eslint-enable */
          ],
        };
        return acc;
      },
      { idList: [] }
    );
    const { dispatch } = this.props;

    return dispatch(
      complianceTestRemoveAction(
        forRemoval.nodeId,
        forRemoval.checkType,
        forRemoval.idList
      )
    );
  }

  alertDocs(selectedDocIndex = {}) {
    /* eslint-disable no-underscore-dangle */
    const params = Object.keys(selectedDocIndex).map(key => ({
      _id: selectedDocIndex[key]._id,
      _type: selectedDocIndex[key]._type,
      _index: selectedDocIndex[key]._index,
    }));
    /* eslint-enable */
    const { dispatch } = this.props;
    return dispatch(requestManualAlertNotification(params));
  }

  unmaskDocs(selectedDocIndex = {}) {
    const { dispatch, cloudType } = this.props;
    const selectedDocIndexValues = Object.keys(selectedDocIndex);
    return dispatch(
      complianceUnmaskDocsAction({ cloudType, selectedDocIndexValues })
    );
  }

  deleteDocs(selectedDocIndex = {}) {
    /* eslint-disable no-underscore-dangle */
    const paramList = Object.keys(selectedDocIndex).map(key => ({
      _id: selectedDocIndex[key]._id,
      _type: selectedDocIndex[key]._type,
      _index: selectedDocIndex[key]._index,
    }));
    const params = paramList.reduce(
      (acc, param) => {
        acc.index_name = param._index;
        acc.doc_type = param._type;
        acc.ids = [...acc.ids, param._id];
        return acc;
      },
      { ids: [] }
    );
    /* eslint-enable */
    const { dispatch } = this.props;
    return dispatch(deleteDocsByIdAction(params));
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
    this.setState({
      page: pageNumber,
    });
  }

  getComplianceTest(params = {}) {
    const {
      dispatch,
      nodeId,
      scanId,
      checkType,
      cloudType,
      hideMasked,
      resource,
      globalSearchQuery = [],
    } = this.props;
    const { page = 0 } = params;
    return dispatch(
      getScanResultsAction({
        nodeId,
        scanId,
        checkType,
        cloudType,
        hideMasked,
        page,
        pageSize: 20,
        resource,
        lucene_query: globalSearchQuery,
        ...params,
      })
    );
  }

  handleDescClick(docId) {
    const { test } = this.props;
    const testResult = [];
    test.hits?.forEach(t => {
      if (t._id === docId) {
        testResult.push(t._source);
      }
    });

    this.setState({
      testData: testResult[0],
      isTestModalOpen: true,
    });
  }

  render() {
    const { test = [], isLoading } = this.props;
    const { page } = this.state;
    const tests = [];
    test.hits?.forEach(t => {
      tests.push(t);
    });

    const isCloud =
      !isLoading &&
      tests.length &&
      tests[0]?._source?.type === 'cloud-compliance-scan';

    const hostType = window.location.hash.split('/').reverse()[0];

    return (
      <>
        <div className="compliance-check-view">
          <DfTableV2
            noDataText="No rows found"
            showPagination
            defaultPageSize={20}
            manual
            totalRows={test.total}
            data={tests}
            page={page}
            columnCustomizable
            multiSelectOptions={{
              actions: this.multiSelectOptions,
              columnConfig: {
                accessor: '_id',
              },
            }}
            name="compliance tests"
            getRowStyle={rowInfo => {
              return {
                opacity:
                  rowInfo && rowInfo.original._source.masked === 'true'
                    ? 0.5
                    : 1,
                cursor: 'pointer',
              };
            }}
            onRowClick={rowInfo => {
              this.handleDescClick(rowInfo.original._source.doc_id);
            }}
            onPageChange={this.handlePageChange}
            columns={[
              {
                Header: 'Timestamp',
                accessor: row => {
                  return dateTimeFormat(row._source['@timestamp']);
                },
                id: '_source.timestamp',
                width: 100,
                minWidth: 50,
                Cell: ({ value }) => {
                  return (
                    <div className="truncate" title={value}>
                      {value}
                    </div>
                  );
                },
              },
              {
                Header: 'Status',
                id: '_source.status',
                width: 70,
                minWidth: 60,
                Cell: ({ row }) => {
                  return (
                    <div
                      className={`compliance-${row.original._source.compliance_check_type}-${row.original._source.status} label box`}
                    >
                      {row.original._source.status}
                    </div>
                  );
                },
              },
              {
                Header: isCloud ? 'Service' : '',
                accessor: '_source.service',
                id: 'service',
                width: isCloud ? 80 : 10,
                minWidth: 80,
                Cell: ({ value }) => {
                  return (
                    <div className="truncate" title={value}>
                      {value || ''}
                    </div>
                  );
                },
              },
              {
                Header: isCloud ? 'Resource' : 'Node name',
                id: '_source.Resource',
                minWidth: 150,
                Cell: ({ row }) => {
                  return (
                    <div className="truncate">
                      {row.original._source.resource ||
                        row.original._source.node_name}
                    </div>
                  );
                },
              },
              {
                /* eslint-disable no-nested-ternary */
                Header: isCloud
                  ? 'Reason'
                  : hostType === 'kubernetes'
                  ? 'Rationale'
                  : 'Description',
                id: '_source.Reason',
                minWidth: 400,
                Cell: ({ row }) => {
                  return (
                    <div className="truncate">
                      {isCloud
                        ? row.original._source.reason
                        : hostType === 'kubernetes'
                        ? row.original._source.test_rationale
                        : row.original._source.description}
                    </div>
                  );
                },
              },
            ]}
          />
          {this.state.isTestModalOpen && this.state.testData ? (
            <ComplianceTestModal
              data={this.state.testData}
              onRequestClose={() => {
                this.setState({
                  isTestModalOpen: false,
                  testData: null,
                });
              }}
            />
          ) : null}
        </div>
      </>
    );
  }
}

function mapStateToProps(state) {
  return {
    test: state.get('compliance_result_scans'),
    isLoading: state.get('compliance_result_scans_loader'),
    globalSearchQuery: state.get('globalSearchQuery') || [],
  };
}

const PollableComplianceTests = connect(mapStateToProps)(
  pollable()(ComplianceTests)
);

export default withRouter(PollableComplianceTests);
