/* eslint-disable react/destructuring-assignment */
// TODO: Rewrite this component
import React, { useEffect, useRef } from 'react';
import { connect, useDispatch } from 'react-redux';
import {
  getTopSecretScanContainerAndHostsAction,
  setSearchQuery,
} from '../../../actions/app-actions';
import { constructGlobalSearchQuery } from '../../../utils/search-utils';
import StackedChart from '../../common/charts/stacked-chart/index';
import pollable from '../../common/header-view/pollable';

// HACK-NOTE: This component relies on data fetched by vulnerability-stats-top-containers.js
// Make sure not to deploy this as a standalone component. It should always
// accompany the other component.
// This hack saves use from writing a new API call
const SecretScanStatsTopHosts = props => {
  const oldProps = useRef(props);
  const dispatch = useDispatch();

  useEffect(() => {
    const { registerPolling, startPolling } = props;
    registerPolling(() => getTopVulnerableHostStats());
    startPolling();
  }, []);

  useEffect(() => {
    const { alertPanelHistoryBound: newBounds, globalSearchQuery: newQuery } =
      props;
    const {
      alertPanelHistoryBound: currentBounds,
      globalSearchQuery: currentQuery,
    } = oldProps.current;

    if (currentBounds !== newBounds || currentQuery !== newQuery) {
      getTopVulnerableHostStats({
        alertPanelHistoryBound: newBounds,
        globalSearchQuery: newQuery,
      });
    }
    oldProps.current = props;
  }, []);

  const getTopVulnerableHostStats = (params = {}) => {
    const {
      alertPanelHistoryBound = props.alertPanelHistoryBound || [],
      globalSearchQuery = props.globalSearchQuery || [],
    } = params;

    const { getTopSecretScanContainerAndHostsAction: action } = props;

    const apiParams = {
      luceneQuery: globalSearchQuery,
      // Conditionally adding number and time_unit fields
      ...(alertPanelHistoryBound.value
        ? { number: alertPanelHistoryBound.value.number }
        : {}),
      ...(alertPanelHistoryBound.value
        ? { timeUnit: alertPanelHistoryBound.value.time_unit }
        : {}),
    };

    return action(apiParams);
  };

  const sectionClickHandler = point => {
    if (!point.type) {
      return;
    }
    const { globalSearchQuery: existingQuery = [] } = props;

    let searchQuery = [];
    if (point.type) {
      const severityParams = {
        cve_severity: point.type,
      };
      searchQuery = constructGlobalSearchQuery(existingQuery, severityParams);
    }

    const globalSearchQuery = {
      searchQuery,
    };
    dispatch(setSearchQuery(globalSearchQuery));
  };

  const { secretScanNodes = [] } = props;
  const data = secretScanNodes && secretScanNodes.host;
  const isDataAvailable = data && data.length > 0;

  return (
    <div className="compliance-pass-stats flex-item flex-item-box margin-right-box">
      <div className="name heading">Top Running Hosts</div>
      {!isDataAvailable && (
        <div className="info" style={{ textAlign: 'center', zIndex: 10 }}>
          no data available
        </div>
      )}
      {isDataAvailable && (
        <StackedChart
          data={data}
          chartHeight={200}
          onSectionClick={point => sectionClickHandler(point)}
        />
      )}
    </div>
  );
};

const mapStateToProps = state => ({
  alertPanelHistoryBound: state.get('alertPanelHistoryBound') || [],
  globalSearchQuery: state.get('globalSearchQuery') || [],
  secretScanNodes: state.getIn(['secretScanNodes', 'data']),
  loading: state.getIn(['secretScanNodes', 'status', 'loading']),
});

export default connect(mapStateToProps, {
  getTopSecretScanContainerAndHostsAction,
})(pollable()(SecretScanStatsTopHosts));
