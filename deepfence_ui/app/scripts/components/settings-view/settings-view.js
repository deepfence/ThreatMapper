/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';

// Custom component imports
import SideNavigation from '../common/side-navigation/side-navigation';
import UserProfileView from './user-profile-view/user-profile-view';
import VulnerabilityManagementView from './logs-management/logs-management';
import DiagnosisView from './diagnosis/index';
import EmailConfiguration from './email-configuration/email-configuration-view';
import GlobalSettings from './global-settings/global-settings';
import ScheduledJobs from './scheduled-jobs/index';
import UserAuditLogs from './user-audit-logs/index';

import { removeUnderscore } from "../../utils/string-utils";
import { getUserRole } from "../../helpers/auth-helper";
import {
  ADMIN_SETTINGS_MENU_COLLECTION, ADMIN_SIDE_NAV_MENU_COLLECTION,
  USER_SIDE_NAV_MENU_COLLECTION, USER_SETTINGS_MUNU_COLLECTION
} from "../../constants/menu-collection";
import Tippy from '@tippyjs/react';
import { logoutUser } from '../../actions/app-actions';
import { AgentSetup } from '../common/agent-setup';

class SettingsView extends React.Component {
  constructor() {
    super();
    this.sideNavMenuCollection = (getUserRole() == 'admin') ? ADMIN_SIDE_NAV_MENU_COLLECTION : USER_SIDE_NAV_MENU_COLLECTION;
    this.adminTabList = ADMIN_SETTINGS_MENU_COLLECTION;
    this.userTabList = USER_SETTINGS_MUNU_COLLECTION;
    this.state = {
      activeMenu: this.sideNavMenuCollection[0],
      activeTab: this.adminTabList[0]
    };
    this.handleOnClick = this.handleOnClick.bind(this);
  }

  componentDidMount() {
    parent.location.hash = 'settings';
  }


  componentWillUnmount() {
    if (this.state.intervalObj) {
      clearInterval(this.state.intervalObj);
    }
  }


  handleOnClick(tab) {
    this.setState({ activeTab: tab });
  }

  logout() {
    this.props.dispatch(logoutUser());
  }

  renderTabsList() {
    const { isLicenseActive } = this.props;
    const tabs = [];
    let tabList;
    if (getUserRole() == 'admin') {
      tabList = this.adminTabList;
    } else {
      tabList = this.userTabList;
    }
    for (let tab = 0; tab < tabList.length; tab++) {
      let tabDetails = tabList[tab];
      const activeClass = tabDetails.name === this.state.activeTab.name ? "active-tab" : "";
      tabs.push(
        <div className={"tab-container " + activeClass}
          key={tab} onClick={() => this.handleOnClick(tabDetails)}>
          <div className="tab">{removeUnderscore(tabDetails.name)}</div>
        </div>
      );
    }
    tabs.push(
      <div className="user-menu" key="user-menu" style={{
        marginLeft: 'auto'
      }}>
        <Tippy content={
          <div className="user-menu-dropdown-wrapper">
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
    )
    return tabs;
  }

  renderActiveTabContent() {
    const activeTab = this.state.activeTab;
    switch (activeTab.name) {
      case 'agent_setup': {
        return <AgentSetup />
      }
      case 'user_management': {
        return <UserProfileView />
      }
      case 'alerts_&_logs_management': {
        return <VulnerabilityManagementView />
      }
      case 'diagnosis': {
        return <DiagnosisView />
      }
      case 'scheduled_jobs': {
        return <ScheduledJobs />
      }
      case 'user_audit_logs': {
        return <UserAuditLogs />
      }
      case 'email_configuration': {
        return <EmailConfiguration />
      }
      case 'global_settings': {
        return <GlobalSettings />
      }
      default: {
        null;
      }
    }
  }

  render() {

    return (
      <div>
        <SideNavigation navMenuCollection={this.sideNavMenuCollection} activeMenu={this.state.activeMenu} />
        {/* // make genralised css */}
        <div className={`alerts-view-switcher-wrapper ${this.props.isSideNavCollapsed ? 'collapse-side-nav' : 'expand-side-nav'}`}>
          <div className="tabs-wrapper tabheading">
            {this.renderTabsList()}
          </div>
          <div className="settings-wrapper">
            {this.renderActiveTabContent()}
          </div>
        </div>

      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    isSideNavCollapsed: state.get('isSideNavCollapsed'),
    hosts: state.get('hosts'),
  };
}

export default connect(
  mapStateToProps
)(SettingsView);
