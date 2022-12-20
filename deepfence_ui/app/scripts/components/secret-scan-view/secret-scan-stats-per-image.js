/* eslint-disable react/destructuring-assignment */
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getSecretScanDataAction, setSearchQuery } from '../../actions/app-actions';
import pollable from '../common/header-view/pollable';
import { constructGlobalSearchQuery } from '../../utils/search-utils';

const SecretScanStatsPerImage = props => {
  const dispatch = useDispatch();

  useEffect(() => {
    const {registerPolling, startPolling} = props;
    registerPolling(getSecretScanImageReport);
    startPolling();
  }, [])

  useEffect(
    () => () => {
      const { stopPolling } = props;
      stopPolling();
    },
    []
  );

  const getSecretScanImageReport = (pollParams) => {
    const {
      globalSearchQuery,
    } = pollParams;
    const params = {
      lucene_query: globalSearchQuery,
    };
    return dispatch(getSecretScanDataAction(params));
  }

  const statsClickHandler = severity => {
    const { globalSearchQuery: existingQuery = [] } = props;

    const searchQuery = constructGlobalSearchQuery(existingQuery, {
      "Severity.level": severity,
    });

    const globalSearchQuery = {
      searchQuery,
    };
    dispatch(setSearchQuery(globalSearchQuery));
  };

  const { data } = props;
  let low = 0;
  let medium = 0;
  let high = 0;
  let total = 0;
  let activeContainers = 0;

  if (data && data.data) {
    data.data.map(d => {
      d.scans.map(s => {
        if (s?.scan_id === props?.scanId) {
          low = s?.severity?.low ?? low;
          medium = s?.severity?.medium ?? medium;
          high = s?.severity?.high ?? high;
          activeContainers = s?.active_containers ?? activeContainers;
          total = s?.total ?? total;
        }
        return 0;
      });
      return 0;
    });
  }

  return (
    <div>
      <div className="top-vulnerability-stats-wrapper">
        <div className="vulnerability-wrapper">
          <div className="vulnerability-details">
            <div className="vulnerability-details-container">
              <div className="count">{total}</div>
              <div className="name">Total</div>
            </div>
          </div>
          <div className="vulnerability-details high-alert"
            onClick={() => statsClickHandler('high')}
          >
            <div
              className="vulnerability-details-container"
              aria-hidden="true"
            >
              <div className="count">{high}</div>
              <div className="name">High</div>
            </div>
          </div>
          <div className="vulnerability-details medium-alert"
              onClick={() => statsClickHandler('medium')}
          >
            <div
              className="vulnerability-details-container"
              aria-hidden="true"
            >
              <div className="count">{medium}</div>
              <div className="name">medium</div>
            </div>
          </div>
          <div className="line-break" />
          <div className="vulnerability-details low-alert"
              onClick={() => statsClickHandler('low')}
          >
            <div
              className="vulnerability-details-container"
              aria-hidden="true"
            >
              <div className="count">{low}</div>
              <div className="name">low</div>
            </div>
          </div>
          <div className="vulnerability-details">
            <div className="vulnerability-details-container">
              <div className="count">{activeContainers}</div>
              <div className="name">Active containers</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default pollable()(SecretScanStatsPerImage);
