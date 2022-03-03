// React imports
import React from 'react';
import { connect } from 'react-redux';
import { Link, withRouter } from 'react-router-dom';
import Tippy from '@tippyjs/react';


// Custom components imports
import SearchBox from '../alert-graph-view/search-box';
import InfraStats from '../top-stats-panel-view/infra-stats';
import DROPDOWN_IMAGE from '../../../../images/dropdown.svg';

import {
  selectAlertHistoryBound, selectRefreshInterval, setSearchQuery,
  toggleFiltersView, noIntegrationComponentChange, logoutUser
} from '../../../actions/app-actions';
import { REFRESH_INTERVALS_OPTIONS, TIME_BOUNDARY_OPTIONS } from '../../../constants/dashboard-refresh-config';
import { SingleSelectDropdown } from '../dropdown/single-select-dropdown';

class HeaderView extends React.Component {
  constructor() {
    super();
    this.state = {};

    this.removeFilter = this.removeFilter.bind(this);
    this.renderIntegration = this.renderIntegration.bind(this);
    this.setRefreshInterval = this.setRefreshInterval.bind(this);
    this.setHistoryBound = this.setHistoryBound.bind(this);
    this.goBackToIntegrations = this.goBackToIntegrations.bind(this);
    this.logout = this.logout.bind(this);
    this.goToSettings = this.goToSettings.bind(this);
  }

  setHistoryBound(dayObj) {
    const { dispatch } = this.props;
    dispatch(selectAlertHistoryBound(dayObj));
  }

  setRefreshInterval(intervalObj) {
    const { dispatch } = this.props;
    dispatch(selectRefreshInterval(intervalObj));
  }

  goBackToIntegrations() {
    const { dispatch } = this.props;
    dispatch(noIntegrationComponentChange());
  }

  renderIntegration() {
    if (window.location.hash === '#/notification') {
      return (
        <div className="dashbord-link" onClick={this.goBackToIntegrations} style={{ cursor: 'pointer' }} aria-hidden="true">
          {this.props.changeIntegration ? (<span className="dashboard-breadcrumb" style={{ marginRight: '2px', color: '#007BFF' }}> Integrations</span>) : (<span>Integrations</span>)}
          {this.props.changeIntegration && <img src={DROPDOWN_IMAGE} alt="breadcrumb" style={{ marginRight: '2px' }} />}
          {this.props.integrationName}
        </div>
      );
    }
    return (
      <div className="dashbord-link">
        {this.props.breadcrumb && this.props.breadcrumb.map((el) => (el.link ? (
          <div style={{ display: 'inline' }} key={`${el.id}-${el.name}`}>
            <span className="dashboard-breadcrumb" style={{ marginRight: '2px' }}>
              <Link key={el.id} to={el.link} replace>
                {el.name}
                {' '}
              </Link>
            </span>
            <img src={DROPDOWN_IMAGE} alt="breadcrumb" style={{ marginRight: '2px' }} />
          </div>
        ) : (
          <span key={`${el.id}-${el.name}`}>
            {' '}
            {el.name}
            {' '}
          </span>
        )))}
      </div>
    );
  }

  componentDidMount() {
    if (!this.props.historyBound) {
      this.props.dispatch(selectAlertHistoryBound(TIME_BOUNDARY_OPTIONS[7]));
    }
    if (!this.props.refreshInterval) {
      this.props.dispatch(selectRefreshInterval(REFRESH_INTERVALS_OPTIONS[2]));
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error(error, errorInfo);
  }

  populateLuceneFilters() {
    const filtersList = this.props.searchQuery.map((filter, index) => (
      // eslint-disable-next-line react/no-array-index-key
      <Tippy content={filter} placement="bottom" trigger="mouseenter" key={index}>
        <div className="filter">
          <div className="filter-name truncate">{filter}</div>
          <div
            className="fa fa-times filter-remove-btn"
            onClick={() => this.removeFilter(index)}
            aria-hidden="true"
            style={{ paddingLeft: '5px' }} />
        </div>
      </Tippy>
    ));
    return filtersList;
  }

  removeFilter(filterIndex) {
    const queryCollection = JSON.parse(JSON.stringify(this.props.searchQuery));
    if (filterIndex === 0) {
      const appliedFilter = queryCollection[filterIndex].slice(1, -1);
      this.child.clearSearchBox(appliedFilter);
    }
    queryCollection.splice(filterIndex, 1);
    this.props.dispatch(setSearchQuery({ searchQuery: queryCollection }));
    if (queryCollection.length === 0) {
      this.props.dispatch(toggleFiltersView());
    }
  }

  logout() {
    this.props.dispatch(logoutUser());
  }

  goToSettings() {
    const { history } = this.props;
    history.push('/settings');
  }

  render() {
    return (
      <div className={`header-view ${this.props.isSideNavCollapsed ? 'collapse-fixed-panel' : 'expand-fixed-panel'}`}>
        <div className="infra-summary">
          {this.renderIntegration()}
          <SearchBox onRef={ref => { (this.child = ref) }} />
          <SingleSelectDropdown
            prefixText="from "
            onChange={this.setHistoryBound}
            options={TIME_BOUNDARY_OPTIONS}
            defaultValue={this.props.historyBound}
            width={150}
          />
          <SingleSelectDropdown
            prefixText="refresh "
            onChange={this.setRefreshInterval}
            options={REFRESH_INTERVALS_OPTIONS}
            defaultValue={this.props.refreshInterval}
            width={150}
          />
          <InfraStats />
          <div className="user-menu">
            <Tippy content={
              <div className="user-menu-dropdown-wrapper">
                <div className="user-menu-dropdown-item" onClick={() => { this.goToSettings() }}>
                  <div className="user-menu-item-icon">
                    <i className="fa fa-cog" aria-hidden="true" />
                  </div>
                  <div className="user-menu-item-text">
                    Settings
                  </div>
                </div>
                <div className="user-menu-dropdown-item" onClick={() => { this.logout() }}>
                  <div className="user-menu-item-icon">
                    <i className="fa fa-sign-out" aria-hidden="true" />
                  </div>
                  <div className="user-menu-item-text">
                    Sign out
                  </div>
                </div>
              </div>
            } placement="bottom" trigger="click" interactive >
              <div>
                <i className="fa fa-user-circle-o user-icon" aria-hidden="true" />
                <i className="fa fa-caret-down" aria-hidden="true" />
              </div>
            </Tippy>
          </div>
        </div>
        {this.props.isFiltersViewVisible && <div className="lucene-filters-wrapper">{this.populateLuceneFilters()}</div>}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    historyBound: state.get('alertPanelHistoryBound'),
    refreshInterval: state.get('refreshInterval'),
    isSideNavCollapsed: state.get('isSideNavCollapsed'),
    searchQuery: state.get('globalSearchQuery'),
    isFiltersViewVisible: state.get('isFiltersViewVisible'),
    breadcrumb: state.get('breadcrumb'),
    integrationName: state.get('integrationName'),
    changeIntegration: state.get('changeIntegration'),
  };
}

export default connect(
  mapStateToProps
)(withRouter(HeaderView));
