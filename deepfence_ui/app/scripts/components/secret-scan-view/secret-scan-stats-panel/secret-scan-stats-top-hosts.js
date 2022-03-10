import React, { useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import {
  getTopSecretScanContainerAndHostsAction,
  setSearchQuery,
} from '../../../actions/app-actions';
import { constructGlobalSearchQuery } from '../../../utils/search-utils';
import StackedChart, { sortChartNodes } from '../../common/charts/stacked-chart/index';
import pollable from '../../common/header-view/pollable';

const SecretScanStatsTopHosts = props => {
  const dispatch = useDispatch();
  const { registerPolling, startPolling } = props;

  useEffect(() => {
    registerPolling(getTopSecretHostStats);
    startPolling();
  }, []);

  const getTopSecretHostStats = (params = {}) => {
    const {
      alertPanelHistoryBound = props.alertPanelHistoryBound || [],
      globalSearchQuery
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
        "Severity.level": point.type,
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
          data={sortChartNodes(data)}
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
