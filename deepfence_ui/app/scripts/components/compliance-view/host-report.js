/* eslint-disable react/no-access-state-in-setstate */
/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import { getComplianceScanListAction } from '../../actions/app-actions';
import pollable from '../common/header-view/pollable';
import HostReportRowDetail from './host-report-row-detail';

class HostReport extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {};
    this.rowClickHandler = this.rowClickHandler.bind(this);
    this.onExpandedChange = this.onExpandedChange.bind(this);
    this.setRowCount = this.setRowCount.bind(this);
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const defaultExpandedRows = arr.reduce((acc, el) => {
      acc[el] = {};
      return acc;
    }, {});
    this.defaultExpandedRows = defaultExpandedRows;
    this.handleDownload = this.handleDownload.bind(this);
    this.state = {
      expandedRowIndex: 0,
    };
    this.getComplianceHostReport = this.getComplianceHostReport.bind(this);
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    const { filterValues: currentFiltervalues } = this.props;
    if (
      newProps.filterValues &&
      currentFiltervalues !== newProps.filterValues
    ) {
      this.getComplianceHostReport({
        filters: newProps.filterValues,
      });
      this.handlePageChange(0);
    }
    if (
      newProps.isLicenseActive &&
      !newProps.isLicenseExpired &&
      (newProps.licenseResponse.license_status === 'expired' ||
        newProps.licenseResponse.license_status === 'hosts_exceeded')
    ) {
      /* eslint-disable */
      this.setState({
        licenseResponse: newProps.licenseResponse,
        isLicenseExpiryModalVisible: true,
      });
    } else {
      this.setState({
        isLicenseExpiryModalVisible: false,
      });
    }
  }

  componentDidMount() {
    // pollable: register the function which needs to be polled
    const { registerPolling, startPolling } = this.props;
    registerPolling(this.getComplianceHostReport);
    startPolling();
  }

  componentWillUnmount() {
    // pollable: stop polling on unmount
    const { stopPolling } = this.props;
    stopPolling();
  }

  handleDownload(scanId, nodeType) {
    const { handleDownload } = this.props;
    return handleDownload({
      scanId,
      nodeType : this.props.scanType,
    });
  }

  rowClickHandler(nodeId, scanId, scanType) {
    const { checkType } = this.props;
    this.setState({
      redirect: true,
      link: `/compliance/summary/${nodeId}/${checkType}/${scanId}/${scanType}`,
    });
  }

  getComplianceHostReport(pollParams = {}) {
    const { dispatch, checkType, filterValues = {}, nodeId } = this.props;
    const cloudType = window.location.hash.split('/').reverse()[3];
    const { globalSearchQuery, initiatedByPollable, page = 0, alertPanelHistoryBound } = pollParams;

    const params = {
      checkType,
      lucene_query: globalSearchQuery,
      nodeId,
      cloudType,
      initiatedByPollable,
      from: page * 10,
      ...(alertPanelHistoryBound.value
        ? { number: alertPanelHistoryBound.value.number }
        : {}),
      ...(alertPanelHistoryBound.value
        ? { time_unit: alertPanelHistoryBound.value.time_unit }
        : {}),
    };
    return dispatch(getComplianceScanListAction(params));
  }

  onExpandedChange(rowInfo) {
    const expandedRowIndex = {
      ...this.state.expandedRowIndex,
    };
    const pageIndex = rowInfo.index;
    if (expandedRowIndex[pageIndex]) {
      expandedRowIndex[pageIndex] = !expandedRowIndex[pageIndex];
    } else {
      expandedRowIndex[pageIndex] = {};
    }
    this.setState({
      expandedRowIndex,
    });
  }

  setRowCount(e) {
    const rowCount = Number(e.target.value);
    this.setState({
      rowCountValue: rowCount,
    });
  }

  render() {
    const { redirect, link } = this.state;
    const { isToasterVisible } = this.props;
    if (redirect) {
      return <Redirect to={link} />;
    }
    const { testValueConfig = [], checkType, scanType } = this.props;
    const testValueColumnsWithValues = testValueConfig.map(el => ({
      Header: el.value,
      accessor: `result.${el.value}`,
      maxWidth: 30,
      width: 30,
      minWidth: 30,
      Cell: row => (
        <div>
          <div className={`compliance-${checkType}-${el.value} value`}>
            {row.value || 0}
          </div>
        </div>
      ),
    }));
    return (
      <div>
        <div style={{ marginBottom: '-45px', display: 'flex' }}>
          <div className="d-flex justify-content-end"></div>
        </div>
        <HostReportRowDetail
          data={this.props?.scanList || []}
          totalRows={this.props.scanListTotal ?? 0}
          rowClickHandler={(nodeId, scanId) =>
            this.rowClickHandler(nodeId, scanId, scanType)
          }
          testValueColumns={testValueColumnsWithValues}
          handleDownload={this.handleDownload}
          dispatch={this.props.dispatch}
          isToasterVisible={isToasterVisible}
          onDelete={() => {
            this.props.updatePollParams();
          }}
          scanType={this.props?.scanType || []}
          updatePollParams={this.props?.updatePollParams}
        />
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    isLoading: state.get('compliance_scan_list_loader'),
    scanList: state.get('compliance_scan_list'),
    scanListTotal: state.get('compliance_scan_list_total'),
    scanType: state.get('compliance_node_type'),
    isLicenseActive: state.get('isLicenseActive'),
    isLicenseExpired: state.get('isLicenseExpired'),
    licenseResponse: state.get('licenseResponse'),
  };
}

export default connect(mapStateToProps)(pollable()(HostReport));
