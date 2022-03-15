/* eslint-disable guard-for-in */
/* eslint-disable prefer-destructuring */
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SunburstChart from '../common/charts/sunburst-chart/index';
import { setSearchQuery } from '../../actions/app-actions';
import { constructGlobalSearchQuery } from '../../utils/search-utils';
import { severityColorsSunBurst } from '../../constants/colors';

const SecretScanReport = props => {
  const dispatch = useDispatch();

  const sectionClickHandler = (point) => {
    const { globalSearchQuery: existingQuery = [] } = props;
    let searchQuery = existingQuery;

    const newSearchParams = {};
    if (point.path === '') return;

    const paths = point.path.split(' / ');

    switch (paths.length) {
      case 1:
        newSearchParams["Severity.level"] = paths[0];
        break;
      case 2:
        newSearchParams["Severity.level"] = paths[0];
        newSearchParams["Rule.name"] = paths[1];
        break;
      default:
        return;
    }
    for (const param in newSearchParams) {
      const newParam = {};
      newParam[param] = newSearchParams[param];
      searchQuery = constructGlobalSearchQuery(searchQuery, newParam);
    }
    dispatch(setSearchQuery({ searchQuery }));
  }

  const summaryStats = useSelector(state =>
    state.getIn(['secretScanReport', 'data'])
  );

  return (
    <div>
      <div className="unique-vulnerabilities" />
      {summaryStats && (
        <SunburstChart
          data={summaryStats}
          name="Secret scan details"
          chartWidth={600}
          chartHeight={600}
          colors={severityColorsSunBurst}
          onSectionClick={point => sectionClickHandler(point)}
        />
      )}
    </div>
  );
};

export default SecretScanReport;
