/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { connect } from 'react-redux';
import { formValueSelector } from 'redux-form/immutable';
import StackedColumnChart from '../common/charts/stacked-chart/column-stacked';
import {
  getComplianceBarChartAction,
  setSearchQuery,
} from '../../actions/app-actions';
import { constructGlobalSearchQuery } from '../../utils/search-utils';
import pollable from '../common/header-view/pollable';
import AppLoader from '../common/app-loader/app-loader';

class ComplianceTestCategoryReport extends React.PureComponent {
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

  getReport(pollParams) {
    const { nodeId, scanId, checkType, cloudType, resource, hideMasked } = this.props;
    const {
      globalSearchQuery,
      initiatedByPollable,
    } = pollParams;
    const page = 0;
    const pageSize = 20;
    const params = {
      nodeId,
      scanId,
      checkType,
      page,
      pageSize,
      lucene_query: globalSearchQuery,
      resource,
      cloudType,
      number: 0,
      time_unit: 'all',
      initiatedByPollable,
      hideMasked,
    };
    this.props.dispatch(getComplianceBarChartAction(params));
  }

  sectionClickHandler(point) {
    const { cloudType } = this.props;
    let newSearchParams;
    if (!point.node) {
      return;
    }
    const { globalSearchQuery: existingQuery = [], dispatch } = this.props;
    if (['linux', 'kubernetes'].includes(cloudType)) {
      newSearchParams = {
        test_category: point.node,
      };
    } else {
      newSearchParams = {
        service: point.node,
      };
    }
    const searchQuery = constructGlobalSearchQuery(
      existingQuery,
      newSearchParams
    );
    const globalSearchQuery = {
      searchQuery,
    };
    dispatch(setSearchQuery(globalSearchQuery));
  }

  componentWillUnmount() {
    const { stopPolling } = this.props;
    stopPolling();
  }

  render() {
    const { isLoading } = this.props;
    const data = this.props?.barData || [];
    const emptyData = data.length === 0 && !isLoading;
    return (
      <div>
        {emptyData && <div className="absolute-center">No Data Available</div>}
        {isLoading === true ? (
          <AppLoader />
        ) : (
          <StackedColumnChart
            data={data}
            onSectionClick={this.sectionClickHandler}
            chartHeight={200}
          />
        )}
      </div>
    );
  }
}
const maskFormSelector = formValueSelector('compliance-mask-filter-form');

function mapStateToProps(state) {
  return {
    isLoading: state.get('compliance_barchart_data_loader'),
    barData: state.get('compliance_barchart_data'),
    hideMasked: maskFormSelector(state, 'hideMasked') ?? true,
  };
}

export default connect(mapStateToProps)(
  pollable()(ComplianceTestCategoryReport)
);
