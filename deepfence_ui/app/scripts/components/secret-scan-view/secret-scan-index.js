import React from 'react';
import SecretScanReportContainer from './secret-scan-report-container';
import SecretScanImageReportContainer from './secret-scan-image-report-container';

const SecretScanView = props => {
  const { location: urlLocation } = props;

  return (
    <div className="">
      <div className="">
        <div className="report">
          <div className="severity-report">
            <SecretScanReportContainer />
          </div>
        </div>
        <div className="table severity-report-table">
          <SecretScanImageReportContainer urlLocation={urlLocation} />
        </div>
      </div>
    </div>
  );
};

export default SecretScanView;
