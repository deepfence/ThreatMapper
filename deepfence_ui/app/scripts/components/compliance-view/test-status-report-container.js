import React from 'react';
import ComplianceTestStatusReport from './test-status-report';

class ComplianceTestStatusReportContainer extends React.PureComponent {
  render() {
    const { nodeId, checkType, ...rest } = this.props;
    return (
      <div>
        <ComplianceTestStatusReport
          nodeId={nodeId}
          checkType={checkType}
          cloudType={this.props.cloudType}
          {...rest}
        />
      </div>
    );
  }
}

export default ComplianceTestStatusReportContainer;
