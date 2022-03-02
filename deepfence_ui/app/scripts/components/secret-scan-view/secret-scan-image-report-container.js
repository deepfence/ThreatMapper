import React from 'react';
import { connect } from 'react-redux';
import { nodeFilterValueSelector } from '../../selectors/node-filters';
import { toaster } from '../../actions/app-actions';
import SecretScanImageReport from './secret-scan-image-report';

const SecretScanImageReportContainer = props => {
  const { secretScanData, ...rest } = props;
  const data = secretScanData && secretScanData.data;
  const total = secretScanData && secretScanData.total;
  const { isToasterVisible } = props;
  return (
    <div>
      <SecretScanImageReport
        data={data}
        total={total}
        isToasterVisible={isToasterVisible}
        {...rest}
      />
    </div>
  );
};

const mapStateToProps = state => {
  const secretScanData = state.getIn(['secretScan', 'data']);
  return {
    secretScanData,
    filterValues: nodeFilterValueSelector(state),
    isToasterVisible: state.get('isToasterVisible'),
  };
};

export default connect(mapStateToProps, {
  toaster,
})(SecretScanImageReportContainer);
