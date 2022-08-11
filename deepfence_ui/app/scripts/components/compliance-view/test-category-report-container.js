import React from 'react';
import ComplianceTestCategoryReport from './test-category-report';

class ComplianceTestCategoryReportContainer extends React.PureComponent {
  render() {
    const { nodeId, checkType, cloudType, ...rest } = this.props;
    return (
      <div>
        <div className="cis-title">Compliance scan summary</div>
        <ComplianceTestCategoryReport
          nodeId={nodeId}
          checkType={checkType}
          cloudType={this.props.cloudType}
          {...rest}
        />
      </div>
    );
  }
}

export default ComplianceTestCategoryReportContainer;
