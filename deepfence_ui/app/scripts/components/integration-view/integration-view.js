/* eslint-disable no-unused-vars */

// React imports
import React, {useEffect, useState} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import classnames from 'classnames';

// Custom component imports
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
import Reports from './reports/reports';
import { getIntegrations } from '../../utils/web-api-utils';


import { integrationComponentChange, noIntegrationComponentChange,
  setIntegrationName
} from '../../actions/app-actions';
import { INTEGRATION_MENU_COLLECTION, ADMIN_SIDE_NAV_MENU_COLLECTION, USER_SIDE_NAV_MENU_COLLECTION } from '../../constants/menu-collection';
import { getUserRole } from "../../helpers/auth-helper";

const IntegrationView = (props) => {

  const dispatch = useDispatch();
  const isSideNavCollapsed = useSelector(state => state.get('isSideNavCollapsed'));
  const changeIntegration = useSelector(state => state.get('changeIntegration'));
  const isFiltersViewVisible = useSelector(state => state.get('isFiltersViewVisible'));
  const integrationName = useSelector(state => state.get('integrationName'));
  const IntegrationStatus = useSelector(state => state.get('IntegrationStatus'));
  const hosts = useSelector(state => state.get('hosts'));


  const sideNavMenuCollection = (getUserRole() === 'admin') ? ADMIN_SIDE_NAV_MENU_COLLECTION : USER_SIDE_NAV_MENU_COLLECTION;
  const tabList = INTEGRATION_MENU_COLLECTION;
  const [activeMenu, setActiveMenu] = useState(sideNavMenuCollection[0]);
  const [intervalObj, setIntervalObj] = useState(null);
  const [licenseResponse, setLicenseResponse] = useState(null);
  const [isLicenseExpiryModalVisible, setIsLicenseExpiryModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(tabList[0]);
  const [tabCategory, setTabCategory] = useState('notification');
  const [filteredTabs, setFilteredTabs] = useState(INTEGRATION_MENU_COLLECTION.filter(el => el.category === 'notification'));
  const [erroredCatagories, setErroredCatagories] = useState([]);


  const changeComponent = () => {
    dispatch(integrationComponentChange());
  }
  const goBackToIntegrations = () => {
    dispatch(noIntegrationComponentChange());
  }
  const breadcrumbName = (name) => {
    dispatch(setIntegrationName(name));
    changeComponent();
  }
  const fetchIntegrationList = () => {
    getIntegrations(dispatch);
  }

  useEffect(() => {
    fetchIntegrationList();
    dispatch(noIntegrationComponentChange());
    return () => {
      if (intervalObj) {
        clearInterval(intervalObj);
      }
    }
  }, [])

  useEffect(() => {
    if(changeIntegration === false){
      dispatch(setIntegrationName(null));
    }
  }, [changeIntegration])

  const renderButton = (tabname) => {
    switch (tabname) {
      case 'reports':
        return (
          "Generate Report"
        );
      default:
        return (
          "Configure integration"
        )
    }
  }

  const handleOnClick = (tab) => {
    setActiveTab(tab);
  }

  const renderTabsList = () => {
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
    /* eslint-disable */
    for (let tab = 0; tab < filteredTabs.length; tab++) {
      let tabDetails = filteredTabs[tab];
      const activeClass = tabDetails.name === activeTab.name ? "active-tab" : "";
      let errorFlag = false;
      if (IntegrationStatus) {
        for (let x in IntegrationStatus) {
          const integrationDetails = IntegrationStatus[x]
          integrationDetails && integrationDetails.map(item => {
            if(item.error_msg){
              let errorCatagory =categoryFinder[item.integration_type];
              if (erroredCatagories.indexOf(errorCatagory) === -1){
                erroredCatagories.push(errorCatagory)
              }
            }
          })
        }
        const integrationStatus = IntegrationStatus[tabDetails.name];
        integrationStatus && integrationStatus.map(item => {
          if(item.error_msg){
            errorFlag = true;
          }
        })
      }
      tabs.push(
        <div className={"tab-container " + activeClass} key={tab} onClick={() => handleOnClick(tabDetails)}>
          <div className="integration-box" title={tabDetails.displayName}>
            {tabDetails.icon &&
              <div className="integration-logo" style={{backgroundColor: tabDetails.bgcolor}}> <img className="img-fluid p-2" src={tabDetails.icon} /></div>}
            {tabDetails.iconClassName && <span className={tabDetails.iconClassName} />}
            <div className="integration-name" style={{marginTop: '80px'}}> {tabDetails.displayName}
            {errorFlag ?
            <div className= 'red-dot' style = {{marginLeft: '8px', marginRight: '0px'}}></div>
            :
            <div></div>}
            </div>
            <button type="button" className="btn-configure-integration" onClick={() => breadcrumbName(`${tabDetails.parent + ' / '+ tabDetails.displayName}`)}>{renderButton(tabDetails.name)}</button>
          </div>
        </div>
      );
    }
    return tabs;
  }

  const renderActiveTabContent = () => {
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
      case 'reports': {
        return <Reports />
      }
      case 'microsoft_teams': {
        return <MicrosoftTeamsIntegrationView />
      }
      default: {
        null;
      }
    }
  }


  const handleTabCategoryClick = (categoryId) => {
    setTabCategory(categoryId);
    const allTabs = tabList.map(el => ({ ...el }));
    const filteredTabs = allTabs.filter(tabDetails => tabDetails.category === categoryId);
    if (filteredTabs.length > 0) {
      setActiveTab(filteredTabs[0]);
      setFilteredTabs(filteredTabs);
    }
  }

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
                  onClick={() => handleTabCategoryClick(el.id)}
                >
                  {el.displayName}
                  {
                    erroredCatagories.indexOf(el.id) !== -1 ?
                    (
                      <div className= 'red-dot' style = {{marginLeft: '8px', marginRight: '0px'}} />
                    ):(
                      <div />
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
            {renderTabsList()}
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
            {renderActiveTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntegrationView;
