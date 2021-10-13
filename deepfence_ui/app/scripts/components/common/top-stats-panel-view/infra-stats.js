// TODO: THIS IS WIP
/* eslint-disable no-unused-vars */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/no-unused-state */
import React from 'react';
import {connect} from 'react-redux';
import { Link } from 'react-router-dom';
import {
  fetchTopologyMetrics, noIntegrationComponentChange,
} from '../../../actions/app-actions';
import pollable from '../header-view/pollable';
import DROPDOWN_IMAGE from '../../../../images/dropdown.svg';
import { simplePluralize } from '../../../utils/string-utils';

const getKey = (key) => {
  const keyMapping = {
    cloud_provider: 'CSPs',
    container_image: 'Images',
    kubernetes_cluster: 'Kubernetes',
    kubernetes_namespace: 'Namespaces',
  };

  return keyMapping[key] || simplePluralize(key);
};

const renderGroup = group => (
  <div className="infra-stats-group">
    {Object.entries(group).map(([key, value]) => (
      <div key={key} className="infra-item">
        <div className="count">{value}</div>
        <div className="name">{getKey(key)}</div>
      </div>
    ))}
  </div>
);

class InfraStats extends React.Component {
  constructor(props) {
    super(props);
    const activeMenuItem = localStorage.getItem('selectedMenuItem');
    this.state = {
      selectedMenuItem: activeMenuItem || 'Topology'
    };
    this.fetchCounts = this.fetchCounts.bind(this);
    this.renderIntegration = this.renderIntegration.bind(this);
    this.goBackToIntegrations = this.goBackToIntegrations.bind(this);
  }

  goBackToIntegrations() {
    this.props.dispatch(noIntegrationComponentChange());
  }

  componentDidMount() {
    const {registerPolling, startPolling} = this.props;
    registerPolling(this.fetchCounts);
    startPolling();
  }

  fetchCounts() {
    const {
      fetchTopologyMetrics: action,
    } = this.props;
    return action();
  }

  renderIntegration() {
    if (window.location.hash === '#/notification') {
      return (
        <div className="dashbord-link" onClick={this.goBackToIntegrations} style={{cursor: 'pointer'}} aria-hidden="true">
          {this.props.changeIntegration ? (<span className="dashboard-breadcrumb" style={{marginRight: '2px', color: '#007BFF'}}> Integrations</span>) : (<span>Integrations</span>)}
          {this.props.changeIntegration && <img src={DROPDOWN_IMAGE} alt="breadcrumb" style={{marginRight: '2px'}} />}
          {this.props.integrationName}
        </div>
      );
    }
    return (
      <div className="dashbord-link">
        {this.props.breadcrumb && this.props.breadcrumb.map(el => (el.link ? (
          <div style={{display: 'inline'}} key={el.id}>
            <span className="dashboard-breadcrumb" style={{marginRight: '2px'}} key={el.id}>
              <Link to={el.link} replace>
                {el.name}
                {' '}
              </Link>
            </span>
            <img src={DROPDOWN_IMAGE} alt="breadcrumb" style={{marginRight: '2px'}} />
          </div>
        ) : (
          <span>
            {' '}
            {el.name}
            {' '}
          </span>
        )))}
      </div>
    );
  }

  render() {
    const {
      infraStats = {}
    } = this.props;
    if (infraStats?.coverage?.discovered === infraStats?.coverage?.protected) {
      // delete coverage from infraStats
      delete infraStats.coverage;
    }

    return (
      <div className="metrics-wrapper">
        {Object.entries(infraStats).map(([key, value]) => (
          <div className="infra-stats" key={key}>
            {renderGroup(value)}
          </div>
        ))
        }
      </div>
    );
  }
}


function mapStateToProps(state) {
  return {
    containers: state.get('containers'),
    hosts: state.get('hosts'),
    pods: state.get('pods'),
    kubeClusters: state.get('kube_clusters'),
    searchQuery: state.get('globalSearchQuery'),
    days: state.get('alertPanelHistoryBound'),
    globalSearchQuery: state.get('globalSearchQuery') || [],
    refreshInterval: state.get('refreshInterval'),
    breadcrumb: state.get('breadcrumb'),
    integrationName: state.get('integrationName'),
    changeIntegration: state.get('changeIntegration'),
    infraStats: state.get('topologyMetrics'),
    historyBound: state.get('alertPanelHistoryBound'),
    isFiltersViewVisible: state.get('isFiltersViewVisible')
  };
}
export default connect(
  mapStateToProps, {
    fetchTopologyMetrics,
  }
)(pollable()(InfraStats));
