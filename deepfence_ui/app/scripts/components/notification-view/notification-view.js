// React imports
import React, { useState } from 'react';
import { useSelector } from 'react-redux';

// Custom component imports
import SideNavigation from '../common/side-navigation/side-navigation';
import {
  ADMIN_SIDE_NAV_MENU_COLLECTION,
  USER_SIDE_NAV_MENU_COLLECTION,
} from '../../constants/menu-collection';
import { getUserRole } from '../../helpers/auth-helper';
import IntegrationView from '../integration-view/integration-view';
import HeaderView from '../common/header-view/header-view';

const NotificationsView = props => {
  const sideNavMenuCollection =
    getUserRole() === 'admin'
      ? ADMIN_SIDE_NAV_MENU_COLLECTION
      : USER_SIDE_NAV_MENU_COLLECTION;
  const [activeMenu] = useState(sideNavMenuCollection[0]);
  const isSideNavCollapsed = useSelector(state =>
    state.get('isSideNavCollapsed')
  );
  const match = props;

  return (
    <div>
      <SideNavigation
        navMenuCollection={sideNavMenuCollection}
        activeMenu={activeMenu}
      />
      <div className="protection-polices-view-wrapper">
        <HeaderView />
      </div>
      <div className="">
        <div
          className={`notifications-container ${
            isSideNavCollapsed ? 'collapse-side-nav' : 'expand-side-nav'
          }`}
        >
          <IntegrationView match={match} dispatch={props.dispatch} />
        </div>
      </div>
    </div>
  );
};

export default NotificationsView;
