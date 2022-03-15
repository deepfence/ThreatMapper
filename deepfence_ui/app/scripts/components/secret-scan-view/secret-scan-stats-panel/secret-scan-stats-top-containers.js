/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { connect, useDispatch } from 'react-redux';
import { setSearchQuery } from '../../../actions/app-actions';
import { constructGlobalSearchQuery } from '../../../utils/search-utils';
import StackedChart, { sortChartNodes } from '../../common/charts/stacked-chart/index';

const SecretScanStatsTopContainers = props => {
  const dispatch = useDispatch();

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
});

export default connect(mapStateToProps)(SecretScanStatsTopContainers);
