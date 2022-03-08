/* eslint-disable no-prototype-builtins */
/* eslint-disable no-unused-vars */

// React imports
import React, {useState} from 'react';
import { useSelector, useDispatch } from 'react-redux';

// Custom component imports
import SideNavigation from '../common/side-navigation/side-navigation';
import AppLoader from "../common/app-loader/app-loader";

import {fetchSystemStatus, markNotificationAsSeen,
} from '../../actions/app-actions';
import { removeUnderscore } from '../../utils/string-utils';
import { ADMIN_SIDE_NAV_MENU_COLLECTION, USER_SIDE_NAV_MENU_COLLECTION } from '../../constants/menu-collection';
import { getUserRole } from "../../helpers/auth-helper";
import IntegrationView from "../integration-view/integration-view";
import HeaderView from '../common/header-view/header-view';

const alertColor = { color: '#db2547' };

const NotificationsView = (props) => {

  const dispatch = useDispatch();
  const sideNavMenuCollection = (getUserRole() === 'admin') ? ADMIN_SIDE_NAV_MENU_COLLECTION : USER_SIDE_NAV_MENU_COLLECTION;
  const [activeMenu] = useState(sideNavMenuCollection[0]);
  const [notificationsData, setNotificationsData] = useState();
  const isSideNavCollapsed = useSelector(state => state.get('isSideNavCollapsed'));
  const notificationsResponse = useSelector(state => state.get('notificationsResponse'));
  let containers = useSelector(state => state.get('containers'));
  let hosts = useSelector(state => state.get('hosts'));
  const systemStatusDetails = useSelector(state => state.get('systemStatusDetails'));
  const isSuccess = useSelector(state => state.get('isSuccess'));
  const isError = useSelector(state => state.get('isError'));


  const updateNotificationSeenStatus = () => {
    dispatch(markNotificationAsSeen());
  }

  const getSystemStatus = () => {
    dispatch(fetchSystemStatus());
  }

  const updateNotifications = (notifications) => {
    setNotificationsData(notifications);
  }

  const getNotificationsLeftpanelView = () => {
    hosts = 0;
    containers = 0;
    const esHealthStatus = {
      width: '10px',
      height: '10px',
      backgroundColor: notificationsData ? notificationsData.elasticsearch_cluster_health.status : 'grey',
      borderRadius: '50%',
      marginLeft: '10px'
    };
    return (
      <div className='notifications-wrapper'>
        <div className="notification-details-wrapper">
          <div className="notification-details-row">
            <div className="notification-details-key">Tracking hosts</div>
            <div className="notification-details-value">
              {hosts} out of {notificationsData.no_of_hosts}
            </div>
          </div>
          <div className="notification-details-row">
            <div className="notification-details-key">Tracking containers</div>
            <div className="notification-details-value">{containers}</div>
          </div>
          <div className="notification-details-row" style={alertColor}>
            <div className="notification-details-key">License expiry date</div>
            <div className="notification-details-value">
              {notificationsData.license_expiry_date}
            </div>
          </div>
          <div className="notification-details-row">
            <div className="notification-details-key">System Health</div>
            <div className="notification-details-value">
              <div style={esHealthStatus} />
            </div>
          </div>
          <div className="notification-details-row">
            <div className="notification-details-key">Number of docs</div>
            <div className="notification-details-value">
              {notificationsData.elasticsearch_cluster_health.number_of_docs}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getNotificationRightPanelView = () =>
     (
      <div>
        <div className='system-status-wrapper'>
 	    <div className={notificationsData.critical_alerts > 0 ? 'system-status-critical-heading' : 'system-status-heading'}>
 		Detected	{notificationsData.critical_alerts}	critical alerts
          </div>
        </div>
      </div>
    )


  const getTableView = (table) => {
    const tableDetails = systemStatusDetails[table];
    const tableKeys = Object.keys(tableDetails);
    return (
      <div className='table-view-wrapper col-md-12 col-lg-12' key={table}>
        <div className='table-heading'>{table} status</div>
        <div className='table-wrapper'>
          { tableKeys && tableKeys.map(tableKey=> getTableKeyValuePairView(tableKey, tableDetails) ) }
        </div>
      </div>
    )
  }

  const getTableKeyValuePairView = (tableKey, tableDetails) => (
      <div key={tableKey} className='table-column'>
        <div className='table-key'>{ removeUnderscore(tableKey) }</div>
        <div className='key-value'>{ tableDetails[tableKey] }</div>
      </div>
    )

  const getEmptyState = (response) => {
    let textToBeDisplay;
    if (response) {
      textToBeDisplay = response.error.message;
    }
    return (
      <div>
        { (response === undefined) ? <AppLoader /> : <div className='empty-state-text'>{ textToBeDisplay }</div> }
      </div>
    );
  }

  const checkDataAvailability = (response) => {
    let result = false;
    if (response) {
      if (response.hasOwnProperty('success') && response.success === false) {
        result = false;
      } else {
        result = true;
      }
    } else {
      result = false;
    }
    return result;
  }

  const { match } = props;

  return (
    <div>
      <SideNavigation navMenuCollection={sideNavMenuCollection} activeMenu={activeMenu} />
      <div className="protection-polices-view-wrapper"><HeaderView /></div>
      <div className="">
        <div className={`notifications-container ${isSideNavCollapsed ? 'collapse-side-nav' : 'expand-side-nav'}`}>
          <IntegrationView
          match={match}
          dispatch={props.dispatch}
          />
        </div>
      </div>
    </div>
  );
}

export default NotificationsView;
