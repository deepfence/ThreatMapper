import React from 'react';
import { connect } from 'react-redux';
import { getComplianceChartDataAction } from '../../actions';
import ComplianceTotalTestReport from './total-test-report';
import Loader from '../loader';
import pollable from '../common/header-view/pollable';

const loaderStyle = {
  top: '50%',
};

class ComplianceTotalTestReportContainer extends React.PureComponent {
  constructor(props) {
    super(props);
    this.getComplianceChartData = this.getComplianceChartData.bind(this);
  }

  componentDidMount() {
    const { registerPolling, startPolling, alertPanelHistoryBound } = this.props;
    registerPolling(this.getComplianceChartData);
    startPolling({
      alertPanelHistoryBound,
    });
  }

  getComplianceChartData(pollParams = {}) {
    const { alertPanelHistoryBound, initiatedByPollable } = pollParams;
    const cloudType = window.location.hash.split('/').reverse()[3];
    const { dispatch, nodeId, checkType } = this.props;
    const params = {
      nodeId,
      checkType,
      cloudType,
      initiatedByPollable,
      ...(alertPanelHistoryBound.value
        ? { number: alertPanelHistoryBound.value.number }
        : {}),
      ...(alertPanelHistoryBound.value
        ? { time_unit: alertPanelHistoryBound.value.time_unit }
        : {}),
    };

    return dispatch(getComplianceChartDataAction(params));
  }

  render() {
    const { checkType, isLoading, ...rest } = this.props;
    const data = this.props.chartData?.compliance_scan_status || [];
    const emptyData = (data && data.length === 0) || data[0]?.aggs.length === 0;
    return (
      <div>
        {isLoading === true && <Loader small style={loaderStyle} />}
        {emptyData && (
          <div className="" style={{ margin: '250px', position: 'relative' }}>
            <div className="absolute-center-compliance">No Data Available</div>
          </div>
        )}
        <ComplianceTotalTestReport
          data={data}
          checkType={checkType}
          {...rest}
        />
      </div>
    );
  }
}

const mapStateToProps = state => ({
  reportView: state.getIn(['compliance', 'test_status_report_view']),
  isLoading: state.get('compliance_chart_data_loader'),
  globalSearchQuery: state.get('globalSearchQuery'),
  chartData: state.get('compliance_chart_data'),
});

export default connect(mapStateToProps)(pollable()(ComplianceTotalTestReportContainer));
