/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { connect, useDispatch } from 'react-redux';
import { setSearchQuery } from '../../../actions/app-actions';
import { constructGlobalSearchQuery } from '../../../utils/search-utils';
import StackedChart from '../../common/charts/stacked-chart/index';

// HACK-NOTE: This component relies on data fetched by vulnerability-stats-top-hosts.js
// Make sure not to deploy this as a standalone component. It should always
// accompany the other component.
// This hack saves use from writing a new API call

const SecretScanStatsTopContainers = props => {
  const dispatch = useDispatch();

  // As there doesn't exist a field in vulnerability document to check if its a host or
  // container, we make use of data from another API which correlates data with Scope topology.
  // This component and vulnerability-stats-top-hosts.js component get data from same API, so we
  // disabled the API call from this and just read the store populated by the other component.
  // As there will no API call, we can use this component to do the other dependent API call
  // which the selectors/top-vulnerable-nodes use.

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
  const data = secretScanNodes && secretScanNodes.container_image;
  const isDataAvailable = data && data.length > 0;

  return (
    <div className="compliance-pass-stats flex-item flex-item-box margin-right-box">
      {!isDataAvailable && (
        <div className="info" style={{ zIndex: 10 }}>
          no data available
        </div>
      )}
      <div className="name heading">Top Running Containers</div>
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
});

export default connect(mapStateToProps)(SecretScanStatsTopContainers);
