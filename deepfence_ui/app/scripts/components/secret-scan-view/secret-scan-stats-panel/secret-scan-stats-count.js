import { connect, useDispatch } from 'react-redux';
import React from 'react';
import { constructGlobalSearchQuery } from '../../../utils/search-utils';
import { setSearchQuery } from '../../../actions/app-actions';

const SecretScanStatsCount = props => {
  const dispatch = useDispatch();

  const statsClickHandler = severity => {
    const { globalSearchQuery: existingQuery = [] } = props;

    const searchQuery = constructGlobalSearchQuery(existingQuery, {
      "Severity.level" : severity,
    });

    const globalSearchQuery = {
      searchQuery,
    };
    dispatch(setSearchQuery(globalSearchQuery));
  };

  const { summaryStats } = props;

  let total = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  if (summaryStats) {
    const { children } = summaryStats;
    // eslint-disable-next-line array-callback-return
    children?.map(child => {
      if (child.name === 'high') {
        high += child.value;
      } else if (child.name === 'medium') {
        medium += child.value;
      } else if (child.name === 'low') {
        low += child.value;
      }
    });
    total = low + medium + high;
  }

  return (
    <div className="compliance-stats-count flex-item">
      <div className="stats-table">
        <div className="name heading">Secret Scans</div>
        <div className="total">
          <div className="value"> {total} </div>
          <div className="label"> Total </div>
        </div>
        <div className="checktype-breakup-vulnerability">
          <div
            className="severity-item"
            onClick={() => statsClickHandler('high')}
            aria-hidden="true"
          >
            <div className="high value"> {high} </div>
            <div className="label"> High </div>
          </div>
          <div
            className="severity-item"
            onClick={() => statsClickHandler('medium')}
            aria-hidden="true"
          >
            <div className="medium value"> {medium} </div>
            <div className="label"> Medium </div>
          </div>
          <div
            className="severity-item"
            onClick={() => statsClickHandler('low')}
            aria-hidden="true"
          >
            <div className="low value"> {low} </div>
            <div className="label"> Low </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = state => ({
  summaryStats: state.getIn(['secretScanReport', 'data']),
  globalSearchQuery: state.get('globalSearchQuery'),
});
export default connect(mapStateToProps)(SecretScanStatsCount);
