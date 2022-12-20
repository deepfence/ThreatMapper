/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { connect } from 'react-redux';
import { formValueSelector } from 'redux-form/immutable';
import SemiDonutChart from '../common/charts/semi-donut-chart/index';
import {
  setSearchQuery,
  getResultDonutDataAction,
} from '../../actions/app-actions';
import { constructGlobalSearchQuery } from '../../utils/search-utils';
import pollable from '../common/header-view/pollable';
import { complianceViewMenuIndex } from './menu';
import AppLoader from '../common/app-loader/app-loader';

class ComplianceTestStatusReport extends React.PureComponent {
  constructor(props) {
    super(props);
    this.getReport = this.getReport.bind(this);
    this.sectionClickHandler = this.sectionClickHandler.bind(this);
  }

  componentDidMount() {
    const { registerPolling, startPolling } = this.props;
    registerPolling(this.getReport);
    startPolling();
  }

  componentDidUpdate(prevProps) {
    const { updatePollParams } = this.props;
    if (this.props.refreshCounter !== 0 && prevProps.refreshCounter !== this.props.refreshCounter) {
      updatePollParams({})
    }
  }

  componentWillUnmount() {
    const { stopPolling } = this.props;
    stopPolling();
  }

  getReport(pollParams) {
    const {
      globalSearchQuery,
      initiatedByPollable,
    } = pollParams;
    const { nodeId, scanId, checkType, cloudType, resource, hideMasked } = this.props;
    const params = {
      nodeId,
      scanId,
      checkType,
      cloudType,
      resource,
      lucene_query: globalSearchQuery,
      number: 0,
      time_unit: 'all',
      initiatedByPollable,
      hideMasked,
    };
    this.props.dispatch(getResultDonutDataAction(params));
  }

  sectionClickHandler(point) {
    if (!point.label) {
      return;
    }
    const { globalSearchQuery: existingQuery = [], dispatch } = this.props;
    const newSearchParams = {
      status: point.label,
    };
    const searchQuery = constructGlobalSearchQuery(
      existingQuery,
      newSearchParams
    );
    const globalSearchQuery = {
      searchQuery,
    };
    dispatch(setSearchQuery(globalSearchQuery));
  }

  render() {
    const {
      checkType = '',
      timeOfScan,
      nodeName = '',
      compliant,
      isLoading,
    } = this.props;
    const menuItem = complianceViewMenuIndex[checkType] || {};
    const title = menuItem.displayName || '';
    const scannedAt = timeOfScan ? ` - ${timeOfScan.fromNow()}` : '';
    const compliantPercent = compliant ? `(${compliant} Compliant)` : '';
    const subtitle = `${nodeName} ${compliantPercent} ${scannedAt}`;
    const data = this.props.donutData || [];
    const emptyData = data.length === 0 && !isLoading;
    return (
      <div>
        <div className="cis-title">{title}</div>
        {emptyData && <div className="absolute-center">No Data Available</div>}
        {isLoading === true ? (
          <AppLoader />
        ) : (
          <SemiDonutChart
            data={data}
            title={title.toUpperCase()}
            subtitle={subtitle}
            chartHeight={200}
            chartWidth={200}
            innerRadius={0.7}
            onSectionClick={this.sectionClickHandler}
          />
        )}
      </div>
    );
  }
}
const maskFormSelector = formValueSelector('compliance-mask-filter-form');

function mapStateToProps(state) {
  return {
    isLoading: state.get('compliance_result_donut_loader'),
    donutData: state.get('compliance_result_donut'),
    hideMasked: maskFormSelector(state, 'hideMasked') ?? true,
  };
}

export default connect(mapStateToProps)(pollable()(ComplianceTestStatusReport));
