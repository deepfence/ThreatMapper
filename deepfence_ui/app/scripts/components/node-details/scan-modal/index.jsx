import React, { useCallback, useEffect, Fragment } from 'react';
import { useDispatch } from 'react-redux';
import { getCVEScanStatusAction, getSecretScanStatusAction } from '../../../actions/app-actions';
import pollable from '../../common/header-view/pollable';
import { Devider } from './common';
import { SecretScan } from './secret-scan';
import { VulnerabilityScan } from './vulnerability-scan';

const scans = [
  VulnerabilityScan,
  SecretScan
]

// All the polling logic should be in this component
// there are two ways to track the progress of the scan
// 1. normal scan
// 2. scan that was started with tags
const ScanModal = (props) => {
  const { details, imageId, registerPolling, startPolling, stopPolling } = props;
  const { id } = details;
  const dispatch = useDispatch();

  const pollingFunction = useCallback(({ imageId }) => {
    return Promise.all([
      dispatch(getCVEScanStatusAction(imageId)),
      dispatch(getSecretScanStatusAction(id))
    ]);
  }, []);

  useEffect(() => {
    registerPolling(pollingFunction);
    startPolling({ imageId });
    return () => {
      stopPolling();
    }
  }, []);

  return (
    <div className='scan-modal'>
      {scans.map((ScanComponent, index) => {
        return (
          // eslint-disable-next-line react/no-array-index-key
          <Fragment key={index}>
            <ScanComponent details={details} imageId={imageId} />
            {index !== scans.length - 1 && <Devider />}
          </Fragment>
        );
      })}
    </div>
  );
};


const PollableScanModal = pollable({
  pollingIntervalInSecs: 3,
})(ScanModal);

export { PollableScanModal as ScanModal };
