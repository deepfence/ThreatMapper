import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Route, Link, Redirect } from 'react-router-dom';
import classnames from 'classnames';
import SideNavigation from '../common/side-navigation/side-navigation';
import HeaderView from '../common/header-view/header-view';
import SecretScanStatsView from './secret-scan-stats-panel/secret-scan-stats-view';
import {
  ADMIN_SIDE_NAV_MENU_COLLECTION,
  USER_SIDE_NAV_MENU_COLLECTION,
} from '../../constants/menu-collection';
import { getUserRole } from '../../helpers/auth-helper';
import SecretScanView from './secret-scan-index';
import {
  getSecretScanReportChartAction,
  breadcrumbChange,
} from '../../actions/app-actions';
import pollable from '../common/header-view/pollable';

const menu = [
  {
    id: 'scans',
    displayName: 'Secret Scans',
    component: SecretScanView,
  },
];

const SecretScanHome = props => {
  const { registerPolling, startPolling } = props;
  const sideNavMenuCollection =
    getUserRole() === 'admin'
      ? ADMIN_SIDE_NAV_MENU_COLLECTION
      : USER_SIDE_NAV_MENU_COLLECTION;
  const [activeMenu] = useState(sideNavMenuCollection[0]);
  const [isLicenseExpiryModalVisible, setIsLicenseExpiryModalVisible] =
    useState(false);
  const [licenseResponse, setLicenseResponse] = useState(null);
  const dispatch = useDispatch();
  const isSideNavCollapsed = useSelector(state =>
    state.get('isSideNavCollapsed')
  );
  const isFiltersViewVisible = useSelector(state =>
    state.get('isFiltersViewVisible')
  );
  const globalSearchQuery = useSelector(state =>
    state.get('globalSearchQuery')
  );

  useEffect(() => {
    registerPolling(getReport);
    startPolling({ luceneQuery: globalSearchQuery });
    dispatch(breadcrumbChange([{ name: 'Secret Scan' }]));
  }, []);

  useEffect(() => {
    if (
      props.isLicenseActive &&
      !props.isLicenseExpired &&
      (props.licenseResponse.license_status === 'expired' ||
        props.licenseResponse.license_status === 'hosts_exceeded')
    ) {
      setLicenseResponse(props.licenseResponse);
      setIsLicenseExpiryModalVisible(true);
    } else {
      setIsLicenseExpiryModalVisible(false);
    }
  }, [props]);

  useEffect(
    () => () => {
      const { stopPolling } = props;
      stopPolling();
    },
    []
  );

  const getReport = (params = {}) => {
    dispatch(getSecretScanReportChartAction(params));
  };

  const { match } = props;

  const divClassName = classnames({
    'collapse-side-nav': isSideNavCollapsed,
    'expand-side-nav': !isSideNavCollapsed,
    'show-filters-view': isFiltersViewVisible,
    'hide-filters-view': !isFiltersViewVisible,
  });
  return (
    <div className="cve-summary-view">
      <SideNavigation
        navMenuCollection={sideNavMenuCollection}
        activeMenu={activeMenu}
      />
      <div style={{ overflow: 'hidden' }}>
        <HeaderView />
        <div className={divClassName}>
          <SecretScanStatsView />
        </div>
      </div>
      <div className="summary">
        <div className="tab-links">
          <div className="df-tabs">
            <div className="tabheading">
              <ul>
                {menu.map(menuItem => (
                  <Route
                    key={menuItem.id}
                    path={`${match.path}/${menuItem.id}`}
                    /* eslint-disable react/no-children-prop */
                    children={({ match: linkMatch }) => (
                      <li
                        key={menuItem.id}
                        className={classnames('tab', { active: linkMatch })}
                      >
                        <Link to={`${match.url}/${menuItem.id}`}>
                          {menuItem.displayName}
                        </Link>
                      </li>
                    )}
                  />
                ))}
              </ul>
            </div>
            {menu.map(menuItem => (
              <Route
                key={menuItem.id}
                exact
                path={`${match.path}/${menuItem.id}`}
                render={props => <menuItem.component {...props} />}
              />
            ))}
            <Route
              exact
              path={match.path}
              render={() => <Redirect to={`${match.url}/${menu[0].id}`} />}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default pollable({
  pollingIntervalInSec: 5,
})(SecretScanHome);
