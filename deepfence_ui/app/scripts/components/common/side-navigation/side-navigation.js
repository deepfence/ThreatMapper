// React imports
import React from 'react';
import { connect } from 'react-redux';

// Image imports
import BRAND_LOGO_WITHOUT_NAME from '../../../../images/Deepfence_Logo_Mark.svg';

// Custom component imports
import SideNavMenu from '../side-nav-menu/side-nav-menu';

// Action imports
import {
  getRunningNotificationAction
} from "../../../actions/app-actions";
import pollable from '../header-view/pollable';

const FAILING_INTEGRATION_MESSAGE = 'Integrations are failing';
class SideNavigation extends React.Component {
  constructor(props) {
    super(props);
    this.getRunningNotification = this.getRunningNotification.bind(this);
  }

  getRunningNotification() {
    const {
      getRunningNotificationAction: action,
    } = this.props;
    return action();
  }

  componentDidMount() {
    const {
      registerPolling,
      startPolling,
    } = this.props;
    registerPolling(this.getRunningNotification);
    return startPolling();
  }

  render() {
    const navMenus = this.props.navMenuCollection;
    const {
      runningNotifications = [],
    } = this.props;

    const integrationsAreFailing = runningNotifications.filter(notification => notification.content === FAILING_INTEGRATION_MESSAGE).length > 0;
    return (
      <div className={`side-navigation-wrapper ${this.props.isSideNavCollapsed ? 'collapsed-side-nav' : 'expanded-side-nav'}`}>
        <div className="brand-logo-wrapper">
          <a href="#/topology">
          <img src={BRAND_LOGO_WITHOUT_NAME} alt="DeepFence Logo" className="brand-logo" />
          </a>
        </div>
        <div className="navigation-menu-wrapper">
          {navMenus.map(menu => (<SideNavMenu key={menu.name} data={menu} link={menu.link} integrationsAreFailing={integrationsAreFailing} />))}
        </div>
      </div>
    );
  }
}
const pollableSideNavigation = pollable() (SideNavigation);
function mapStateToProps(state) {
  return {
    isSideNavCollapsed: state.get('isSideNavCollapsed'),
    isNavbarActive: state.get('isNavbarActive'),
    runningNotifications: state.get('running_notifications'),
  };
}

export default connect(
  mapStateToProps, {
    getRunningNotificationAction,
  })(pollableSideNavigation);
