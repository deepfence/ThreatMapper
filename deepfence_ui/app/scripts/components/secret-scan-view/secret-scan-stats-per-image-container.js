import React from 'react';
import { useSelector } from 'react-redux';
import SecretScanStatsPerImage from './secret-scan-stats-per-image';
import Loader from '../loader';

const loaderStyle = {
  top: '20%',
  left: '49.5%',
};

const SecretScanImageStatsContainer = props => {
  const secretScanData = useSelector(state =>
    state.getIn(['secretScan', 'data'])
  );
  const loading = useSelector(state =>
    state.getIn(['secretScan', 'status', 'loading'])
  );
  const { imageName, scanId, ...rest } = props;

  return (
    <div className="relative">
      {loading && <Loader small style={loaderStyle} />}
      <SecretScanStatsPerImage
        data={secretScanData}
        imageName={imageName}
        scanId={scanId}
        {...rest}
      />
    </div>
  );
};

export default SecretScanImageStatsContainer;
