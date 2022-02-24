import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import RadialBarChart from '../common/charts/radial-bar-chart/index';
import { setSearchQuery } from '../../actions/app-actions';
import { constructGlobalSearchQuery } from '../../utils/search-utils';
import { getSeverityColor } from '../../constants/colors';

const SecretScanReport = props => {
  const getActiveStyle = ({ type }) => ({
      fill: getSeverityColor(type, true),
      stroke: 0,
    });

  const sectionClickHandler = point => {
    const { globalSearchQuery: existingQuery = [] } = props;

    const dispatch = useDispatch();

    let searchQuery = [];
    if (point.type) {
      const severityParams = {
        cve_severity: point.type,
      };
      searchQuery = constructGlobalSearchQuery(existingQuery, severityParams);
    }

    if (point.cve_type) {
      const cveTypeParams = {
        cve_type: point.cve_type,
      };
      searchQuery = constructGlobalSearchQuery(searchQuery, cveTypeParams);
    }

    const globalSearchQuery = {
      searchQuery,
    };
    dispatch(setSearchQuery(globalSearchQuery));
  };

  let summaryStats = useSelector(state =>
    state.getIn(['secretScanReport', 'data'])
  );
  let high = [];
  let medium = [];
  let low = [];

  summaryStats?.forEach((item) => {
    if (item.severity === 'high') {
      high.push(item);
    } else if (item.severity === 'Medium') {
      medium.push(item);
    } else if (item.severity === 'Low') {
      low.push(item);
    }
  });
  high.sort((a, b) => b.value - a.value);
  medium.sort((a, b) => b.value - a.value);
  low.sort((a, b) => b.value - a.value);

  high = high.slice(0, 4);
  medium = medium.slice(0, 4);
  low = low.slice(0, 4);

  summaryStats = high.concat(medium, low);

  summaryStats.forEach((item) => {
    item.severity = item.severity.toLowerCase();
  });

  return (
    <div>
      <div className="unique-vulnerabilities" />
      {summaryStats && (
        <RadialBarChart
          data={summaryStats}
          xFieldName="rule_name"
          yFieldName='value'
          colorFieldType='severity'
          chartHeight={600}
          chartWidth={580}
          stacking
          onSectionClick={point => sectionClickHandler(point)}
          colorCb={({ severity }) => getSeverityColor(severity, false)}
          colorShadeCb={({ data }) => getActiveStyle(data)}
        />
      )}
    </div>
  );
};

export default SecretScanReport;
