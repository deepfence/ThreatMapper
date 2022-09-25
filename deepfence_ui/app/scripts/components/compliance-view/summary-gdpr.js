import React from 'react';
import { connect } from 'react-redux';
import HostReportContainer from './host-report-container';
import ComplianceTotalTestReportContainer from './total-test-report-container';
import injectModalTrigger from '../common/generic-modal/modal-trigger-hoc';
import { dateTimeFormat } from '../../utils/time-utils';

const testValueConfigCloud = [
  {
    display: 'Alarm',
    value: 'alarm',
  },
  {
    display: 'Info',
    value: 'info',
  },
  {
    display: 'Ok',
    value: 'ok',
  },
  {
    display: 'Skip',
    value: 'skip',
  },
];

const testValueConfigHosts = [
  {
    display: 'Info',
    value: 'info',
  },
  {
    display: 'Note',
    value: 'note',
  },
  {
    display: 'Pass',
    value: 'pass',
  },
  {
    display: 'Warn',
    value: 'warn',
  },
];

class GdprSummary extends React.PureComponent {

  render() {
    const {
      location: urlLocation,
    } = this.props;
    const cloudType = window.location.hash.split('/').reverse()[3];
    let scanType = '';
    if(cloudType === 'aws' || cloudType === 'azure' || cloudType === 'gcp') {
      scanType = 'cloud'
    }
    else if(cloudType === 'kubernetes' || cloudType === 'linux') {
      scanType = 'host'
    }
    const data =this.props.chartData?.compliance_scan_status[0]|| [];
    const scanTimeStamp = data && data.time_stamp;
    return (
      <div>
        <div className="chart-wrapper top-wrapper">
          <div className="chart-heading">
            <h4>Compliance tests</h4>
            <h5>Overview of the overall compliance</h5>
          </div>
          {scanTimeStamp !== undefined &&
            <div style={{display: 'flex', flexDirection: 'row-reverse', paddingTop: '23px'}}>Last scanned on {dateTimeFormat(scanTimeStamp)}</div>
          }
          <div className="report">
            <div className="total-test-report">
              <ComplianceTotalTestReportContainer
                checkType="gdpr"
                nodeId={this.props.match.params.nodeid}
              />
            </div>
          </div>
        </div>
        <div className="chart-wrapper table-wrapper">
        {
            scanType === 'cloud' &&
            <div className="table relative">
              <HostReportContainer
                nodeId={this.props.match.params.nodeid}
                checkType="gdpr"
                testValueConfig={testValueConfigCloud}
                urlLocation={urlLocation}
              />
            </div>
          }
          {
            scanType === 'host' &&
            <div className="table relative">
              <HostReportContainer
                nodeId={this.props.match.params.nodeid}
                checkType="gdpr"
                testValueConfig={testValueConfigHosts}
                urlLocation={urlLocation}
              />
            </div>
          }
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    chartData: state.get('compliance_chart_data')
  };
}

export default connect(mapStateToProps)(injectModalTrigger(GdprSummary));
