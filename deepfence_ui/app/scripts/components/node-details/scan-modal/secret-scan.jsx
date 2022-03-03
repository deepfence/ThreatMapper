/* eslint-disable no-else-return */
import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import moment from 'moment';
import { startSecretScanAction } from '../../../actions/app-actions';
import { ScanHeadingDetails, ScanWraper } from './common';
import HorizontalLoader from '../../common/app-loader/horizontal-dots-loader';

function getStatusText(status, response) {
  if (!status || status === 'LOADING') {
    return 'Loading scan status...';
  } else if (status === 'QUEUED') {
    return 'Secrets scan is queued';
  } else if (status === 'IN_PROGRESS') {
    return 'Secrets scan is in progress';
  } else if (status === 'COMPLETE') {
    return `Completed secrets scan on ${moment(response?.['@timestamp']).format('MMMM Do YYYY, h:mm:ss a')}`
  } else if (status === 'ERROR') {
    return `Error: ${response?.scan_message}`;
  } else if (status === 'STATUS_ERROR') {
    return `Error getting the status of the scan, please try again later`;
  } else {
    return 'Never scanned';
  }
}
function isErrorStatus(status) {
  return ['ERROR', 'STATUS_ERROR'].includes(status);
}
function isInProgresStatus(status) {
  return ['QUEUED', 'IN_PROGRESS'].includes(status);
}

export const SecretScan = ({
  details,
  imageId
}) => {
  const { type, id } = details;
  const dispatch = useDispatch();

  const { secretScannerStore } = useSelector((state) => {
    const secretScanner = state.get('secretScanner');
    return {
      secretScannerStore: secretScanner ? secretScanner.toJS() : {},
    }
  });

  const statusResponse = secretScannerStore?.status?.[id]?.response;
  const statusCode = secretScannerStore?.status?.[id]?.statusCode;
  const onStartClick = useCallback(() => {
    dispatch(
      startSecretScanAction({
        nodeId: id,
        nodeType: type
      })
    );
  }, [type, id]);

  return (
    <ScanWraper>
      <ScanHeadingDetails
        headingText="Secrets Scan"
        statusText={getStatusText(statusCode, statusResponse)}
        isError={isErrorStatus(statusCode)}
        headingControl={
          isInProgresStatus(statusCode) ? (
            <HorizontalLoader style={{ position: 'static', fontSize: '26px', width: '40px' }} />
          ) : (
            <button
              className="primary-btn"
              type="button"
              onClick={onStartClick}
            >
              Start Scan
            </button>
          )
        }
      />
    </ScanWraper>
  );
};
