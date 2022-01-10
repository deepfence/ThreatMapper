/*eslint-disable*/

// React imports
import React, { useEffect, useState } from 'react';
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

import { removeUnderscore } from '../../utils/string-utils';
import { getUserRole } from '../../helpers/auth-helper';
import {
  ADMIN_SETTINGS_MENU_COLLECTION,
  ADMIN_SIDE_NAV_MENU_COLLECTION,
  USER_SIDE_NAV_MENU_COLLECTION,
  USER_SETTINGS_MUNU_COLLECTION,
} from '../../constants/menu-collection';

const SettingsView = props => {
  let sideNavMenuCollection = (getUserRole() == 'admin') ? ADMIN_SIDE_NAV_MENU_COLLECTION : USER_SIDE_NAV_MENU_COLLECTION;
  let adminTabList = ADMIN_SETTINGS_MENU_COLLECTION;
  let userTabList = USER_SETTINGS_MUNU_COLLECTION;
  const [activeMenu, setActiveMenu] = useState(sideNavMenuCollection && sideNavMenuCollection[0]);
  const [activeTab, setActiveTab] = useState(adminTabList && adminTabList[0]);

  useEffect(() => {
    parent.location.hash = 'settings';
    return () => {
      if (this.state.intervalObj) {
        clearInterval(this.state.intervalObj);
      }
    };
  }, []);

  const handleOnClick = tab => {
    setActiveTab(tab);
  };

  const renderTabsList = () => {
    const tabs = [];
    let tabList;
    if (getUserRole() == 'admin') {
      tabList = adminTabList;
    } else {
      tabList = userTabList;
    }
    for (let tab = 0; tab < tabList.length; tab++) {
      let tabDetails = tabList[tab];
      console.log(tabDetails);
      console.log(activeTab);
      const activeClass =
        tabDetails && tabDetails.name === activeTab.name ? 'active-tab' : '';
      tabs.push(
        <div
          className={'tab-container ' + activeClass}
          key={tab}
          onClick={() => handleOnClick(tabDetails)}
        >
          <div className="tab">{removeUnderscore(tabDetails.name)}</div>
        </div>
      );
    }
    return tabs;
  };

  const renderActiveTabContent = () => {
    switch (activeTab.name) {
      case 'user_management': {
        return <UserProfileView />;
      }
      case 'alerts_&_logs_management': {
        return <VulnerabilityManagementView />;
      }
      case 'diagnosis': {
        return <DiagnosisView />;
      }
      case 'scheduled_jobs': {
        return <ScheduledJobs />;
      }
      case 'user_audit_logs': {
        return <UserAuditLogs />;
      }
      case 'email_configuration': {
        return <EmailConfiguration />;
      }
      case 'global_settings': {
        return <GlobalSettings />;
      }
      default: {
        null;
      }
    }
  };

  return (
    <div>
      <SideNavigation
        navMenuCollection={sideNavMenuCollection}
        activeMenu={activeMenu}
      />
      {/* // make genralised css */}
      <div
        className={`alerts-view-switcher-wrapper ${
          props.isSideNavCollapsed ? 'collapse-side-nav' : 'expand-side-nav'
        }`}
      >
        <div className="tabs-wrapper tabheading">{renderTabsList()}</div>
        <div className="settings-wrapper">{renderActiveTabContent()}</div>
      </div>
    </div>
  );
};

const mapStateToProps = state => ({
  isSideNavCollapsed: state.get('isSideNavCollapsed'),
  hosts: state.get('hosts'),
});

export default connect(mapStateToProps)(SettingsView);
