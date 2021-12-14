
/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';
import { Route, Link, Redirect } from 'react-router-dom';
import classnames from 'classnames';

// Custom component imports
import SideNavigation from '../common/side-navigation/side-navigation';
import EmailIntegrationView from './email-integration-view/email-integration-view';
import SlackIntegrationView from './slack-integration-view/slack-integration-view';
import MicrosoftTeamsIntegrationView from './microsoft-teams-integration-view/microsoft-teams-integration-view';
import PagerDutyIntegrationView from './pager-duty-integration-view/pager-duty-integration-view';
import SplunkIntegrationView from './splunk-integration-view/index';
import ElasticSearchIntegrationView from './elasticsearch-integration-view/index';
import AWSS3IntegrationView from './aws-s3-integration-view/index';
import HTTPEndpointView from './http-endpoint-view/index';
import GoogleChronicleEndpointView from './google-chronicle-view/index';
import JiraIntegrationView from './jira-integration-view';
import SumoLogicView from './sumo-logic-view';
import ReportDownload from './report-download/index';
import PdfReportDownload from './pdf-report-download/index';
import { getIntegrations } from '../../utils/web-api-utils';


import { integrationComponentChange, noIntegrationComponentChange,
  setIntegrationName
} from '../../actions/app-actions';
import {
  IS_NOTIFICATION_CHECK_ENABLE,
  NOTIFICATION_POLLING_DURATION
} from '../../constants/visualization-config';
import { INTEGRATION_MENU_COLLECTION, ADMIN_SIDE_NAV_MENU_COLLECTION, USER_SIDE_NAV_MENU_COLLECTION } from '../../constants/menu-collection';
import { getUserRole } from "../../helpers/auth-helper";

class IntegrationView extends React.Component {
  constructor() {
    super();
    this.sideNavMenuCollection = (getUserRole() == 'admin') ? ADMIN_SIDE_NAV_MENU_COLLECTION : USER_SIDE_NAV_MENU_COLLECTION;
    this.tabList = INTEGRATION_MENU_COLLECTION;
    this.state = {
      activeMenu: this.sideNavMenuCollection[0],
      activeTab: this.tabList[0],
      tabCategory: 'notification',
      filteredTabs: INTEGRATION_MENU_COLLECTION.filter(el => el.category === 'notification'),
      erroredCatagories: [],
    };
    this.handleOnClick = this.handleOnClick.bind(this);
    this.handleTabCategoryClick = this.handleTabCategoryClick.bind(this);
    this.changeComponent = this.changeComponent.bind(this);
    this.goBackToIntegrations = this.goBackToIntegrations.bind(this);
    this.breadcrumbName = this.breadcrumbName.bind(this);
    this.renderButton = this.renderButton.bind(this);
  }
  changeComponent() {
    this.props.dispatch(integrationComponentChange());
  }
  goBackToIntegrations() {
    this.props.dispatch(noIntegrationComponentChange());
  }
  breadcrumbName(name) {
    this.props.dispatch(setIntegrationName(name));
    this.changeComponent();
  }
  fetchIntegrationList() {
    getIntegrations(this.props.dispatch);
  }

  componentDidMount() {
    this.fetchIntegrationList();
    this.props.dispatch(noIntegrationComponentChange());
  }

  componentWillUnmount() {
    if (this.state.intervalObj) {
      clearInterval(this.state.intervalObj);
    }
  }

  componentDidUpdate(){
    const { changeIntegration} = this.props;
    if(changeIntegration === false){
      this.props.dispatch(setIntegrationName(null));
    }
  }
  UNSAFE_componentWillReceiveProps(newProps) {
    if ((newProps.isLicenseActive && !newProps.isLicenseExpired) &&
    (newProps.licenseResponse.license_status == 'expired' || newProps.licenseResponse.license_status == 'hosts_exceeded')) {
      this.setState({
        licenseResponse: newProps.licenseResponse,
        isLicenseExpiryModalVisible: true
      });
    } else {
      this.setState({
        isLicenseExpiryModalVisible: false
      });
    }
  }

  renderButton(tabname) {
    switch (tabname) {
      case 'xlsx':
      case 'pdf':
        return (
          "Generate Report"
        );
      default:
        return (
          "Configure integration"
        )
    }
  }

  handleOnClick(tab) {
    this.setState({ activeTab: tab });
  }

  renderTabsList() {
    const imgIcon = {
      height: '65px',
      marginLeft: '15px',
      marginTop: '10px'
    }
    const tabs = [];
    const categoryFinder = {
      'slack':'notification',
      'microsoft_teams':'notification',
      'pagerduty':'notification',
      'email':'notification',
      'http_endpoint':'notification',
      'google_chronicle':'siem',
      'splunk':'siem',
      'elasticsearch':'siem',
      'sumo_logic':'siem',
      'jira':'ticketing',
      's3':'archival',
    }
    const {
      tabCategory,
      filteredTabs,
    } = this.state;
          /* eslint-disable */
    for (let tab = 0; tab < filteredTabs.length; tab++) {
      let tabDetails = filteredTabs[tab];
      const activeClass = tabDetails.name === this.state.activeTab.name ? "active-tab" : "";
      let errorFlag = false;
      if (this.props.IntegrationStatus) {
        for (let x in this.props.IntegrationStatus) {
          const integrationDetails = this.props.IntegrationStatus[x]
          integrationDetails && integrationDetails.map(item => {
            if(item.error_msg){
              let errorCatagory =categoryFinder[item.integration_type];
              if (this.state.erroredCatagories.indexOf(errorCatagory) === -1){
                this.state.erroredCatagories.push(errorCatagory)
              }
            }
          })
        }
        const integrationStatus = this.props.IntegrationStatus[tabDetails.name];
        integrationStatus && integrationStatus.map(item => {
          if(item.error_msg){
            errorFlag = true;
          }
        })
      }
      tabs.push(
        <div className={"tab-container " + activeClass} key={tab} onClick={() => this.handleOnClick(tabDetails)}>
          <div className="integration-box" title={tabDetails.displayName}>
            {tabDetails.icon &&
              <div className="integration-logo" style={{backgroundColor: tabDetails.bgcolor}}> <img style={imgIcon} src={tabDetails.icon} /></div>}
            {tabDetails.iconClassName && <span className={tabDetails.iconClassName} />}
            <div className="integration-name" style={{marginTop: '80px'}}> {tabDetails.displayName}
            {errorFlag ?
            <div className= 'red-dot' style = {{marginLeft: '8px', marginRight: '0px'}}></div>
            :
            <div></div>}
            </div>
            <button type="button" className="btn-configure-integration" onClick={() => this.breadcrumbName(`${tabDetails.parent + ' / '+ tabDetails.displayName}`)}>{this.renderButton(tabDetails.name)}</button>
          </div>
        </div>
      );
    }
    return tabs;
  }

  renderActiveTabContent() {
    const activeTab = this.state.activeTab;
    switch (activeTab.name) {
      case 'email': {
        return <EmailIntegrationView />
      }
      case 'slack': {
        return <SlackIntegrationView />
      }
      case 'pagerduty': {
        return <PagerDutyIntegrationView />
      }
      case 'splunk': {
        return <SplunkIntegrationView />
      }
      case 'elasticsearch': {
        return <ElasticSearchIntegrationView />
      }
      case 's3': {
        return <AWSS3IntegrationView />
      }
      case 'http_endpoint': {
        return <HTTPEndpointView />
      }
      case 'google_chronicle': {
        return <GoogleChronicleEndpointView />
      }
      case 'jira': {
        return <JiraIntegrationView />
      }
      case 'sumo_logic': {
        return <SumoLogicView />
      }
      case 'xlsx': {
        return <ReportDownload />
      }
      case 'pdf': {
        return <PdfReportDownload />
      }
      case 'microsoft_teams': {
        return <MicrosoftTeamsIntegrationView />
      }
      default: {
        null;
      }
    }
  }


  handleTabCategoryClick(categoryId) {
    const params = {
      tabCategory: categoryId,
    }
    const allTabs = this.tabList.map(el => ({ ...el }));
    const filteredTabs = allTabs.filter(tabDetails => tabDetails.category === categoryId);
    if (filteredTabs.length > 0) {
      const activeTab = filteredTabs[0];
      params['activeTab'] = activeTab;
      params['filteredTabs'] = filteredTabs;
    }
    this.setState(params);
  }

  render() {
    const { isLicenseExpiryModalVisible, tabCategory } = this.state;
    const { changeIntegration } = this.props;
    const activeTab = this.state.activeTab;
    const tabCategoryList = [
      {
        id: 'notification',
        displayName: 'Notification',
      },
      {
        id: 'siem',
        displayName: 'SIEM',
      },
      {
        id: 'ticketing',
        displayName: 'Ticketing',
      },
      {
        id: 'archival',
        displayName: 'Archival',
      },
      {
        id: 'report',
        displayName: 'Reports',
      },
    ];
    if (changeIntegration === false) {
      return (
        <div>
          <div className="alerts-view-switcher-wrapper">
            <div className="df-tabs" style={{marginTop: '55px'}}>
              <div className="tabs-wrapper tabheading" style={{ color: 'white', display: 'flex', fontSize: '20px' }}>

                {tabCategoryList.map(el => (
                  /* eslint-disable react/no-children-prop */
                  <li
                    key={el.id}
                    className={classnames('tab', { active: el.id === tabCategory })}
                    onClick={() => this.handleTabCategoryClick(el.id)}
                  >
                    {el.displayName}
                    {
                      this.state.erroredCatagories.indexOf(el.id) !== -1 ?
                      (
                        <div className= 'red-dot' style = {{marginLeft: '8px', marginRight: '0px'}}></div>
                      ):(
                        <div></div>
                      )
                    }

                  </li>
                )
                  /* eslint-enable */
                // eslint-disable-next-line function-paren-newline
                )}

              </div>
            </div>
            <div className="intergation-inner-wrapper">
              {this.renderTabsList()}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div style={{marginTop: '53px'}}>
        <div className="chart-wrapper">
          <div className="integration-container">
            <div className="tabs-content-wrapper">
              {this.renderActiveTabContent()}
            </div>
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
    changeIntegration: state.get('changeIntegration'),
    // eslint-disable-next-line no-dupe-keys
    isSideNavCollapsed: state.get('isSideNavCollapsed'),
    isFiltersViewVisible: state.get('isFiltersViewVisible'),
    integrationName: state.get('integrationName'),
    IntegrationStatus: state.get('IntegrationStatus')

  };
}

export default connect(
  mapStateToProps
)(IntegrationView);
