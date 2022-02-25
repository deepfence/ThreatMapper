import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SunburstChart from '../common/charts/sunburst-chart/index';
import { setSearchQuery } from '../../actions/app-actions';
import { constructGlobalSearchQuery } from '../../utils/search-utils';
import { severityColorsSunBurst } from '../../constants/colors';

const SecretScanReport = props => {
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
