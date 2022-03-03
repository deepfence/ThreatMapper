import React from 'react';
import { useSelector } from 'react-redux';
import SecretScanReport from './secret-scan-report';
import Loader from '../loader';

const loaderStyle = {
  top: '50%',
};

const SecretScanReportContainer = props => {
  const { ...rest } = props;
  const reportView = useSelector(state =>
    state.getIn(['secretScanReport', 'data'])
  );
  const loading = useSelector(state =>
    state.getIn(['secretScanReport', 'status', 'loading'])
  );
  const emptyData = reportView && reportView.length === 0 && !loading;
  return (
    <div>
      {loading && reportView?.length === 0 && (
        <Loader small style={loaderStyle} />
      )}
      {emptyData && <div className="absolute-center">No Data Available</div>}
      <SecretScanReport data={reportView} {...rest} />
    </div>
  );
};

export default SecretScanReportContainer;
