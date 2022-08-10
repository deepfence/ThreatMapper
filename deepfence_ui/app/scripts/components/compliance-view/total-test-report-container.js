import React from 'react';
import { connect } from 'react-redux';
import { getComplianceChartDataAction } from '../../actions';
import ComplianceTotalTestReport from './total-test-report';
import Loader from '../loader';

const loaderStyle = {
  top: '50%',
};

class ComplianceTotalTestReportContainer extends React.PureComponent {
  componentDidMount() {
    const cloudType = window.location.hash.split('/').reverse()[3];
    const { nodeId, checkType } = this.props;
    this.props.dispatch(
      getComplianceChartDataAction({ nodeId, checkType, cloudType })
    );
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

export default connect(mapStateToProps)(ComplianceTotalTestReportContainer);
