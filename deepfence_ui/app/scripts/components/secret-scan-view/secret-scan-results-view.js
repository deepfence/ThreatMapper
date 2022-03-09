import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import classnames from 'classnames';
import { Redirect } from 'react-router-dom';
import moment from 'moment';
import HeaderView from '../common/header-view/header-view';
import SideNavigation from '../common/side-navigation/side-navigation';
import NotificationToaster from '../common/notification-toaster/notification-toaster';
import SecretScanChartView from './secret-scan-chart-view';
import SecretScanTableV2 from './secret-scan-table-view/secret-scan-table-v2-view';
import SecretScanImageStatsContainer from './secret-scan-stats-per-image-container';

import {
  IS_NOTIFICATION_CHECK_ENABLE,
  NOTIFICATION_POLLING_DURATION,
} from '../../constants/visualization-config';
import { setActiveFilters, breadcrumbChange } from '../../actions/app-actions';
import {
  ADMIN_SIDE_NAV_MENU_COLLECTION,
  USER_SIDE_NAV_MENU_COLLECTION,
} from '../../constants/menu-collection';
import { getUserRole } from '../../helpers/auth-helper';

const SecretScanResultsView = props => {
  const dispatch = useDispatch();
  const sideNavMenuCollection =
    getUserRole() === 'admin'
      ? ADMIN_SIDE_NAV_MENU_COLLECTION
      : USER_SIDE_NAV_MENU_COLLECTION;
  const [activeMenu, setActiveMenu] = useState(sideNavMenuCollection[0]);
  const [redirectBack, setRedirectBack] = useState(false);
  const [link, setLink] = useState('');
  const [intervalObj, setIntervalObj] = useState(null);
  const [licenseResponse, setLicenseResponse] = useState(null);
  const [isLicenseExpiryModalVisible, setIsLicenseExpiryModalVisible] =
    useState(false);

  const hosts = useSelector(state => state.get('hosts'));
  const isToasterVisible = useSelector(state => state.get('isToasterVisible'));
  const isSideNavCollapsed = useSelector(state =>
    state.get('isSideNavCollapsed')
  );
  const isFiltersViewVisible = useSelector(state =>
    state.get('isFiltersViewVisible')
  );

  const handleBackButton = () => {
    setRedirectBack(true);
    setLink('/secret-scan/scans?b');
  };

  useEffect(() => {
    const { match: { params: { scanId } = {} } = {} } = props;
    const unEscapedScanId = decodeURIComponent(scanId);
    const lastUnderscoreIndex = unEscapedScanId.lastIndexOf('_');
    const unEscapedImageName = unEscapedScanId.substring(
      0,
      lastUnderscoreIndex
    );
    let changedImageName = unEscapedImageName;
    if (unEscapedImageName.length > 20) {
      changedImageName = `${unEscapedImageName.substring(0, 19)}...`;
    }
    dispatch(
      breadcrumbChange([
        { name: 'Secret Scan', link: '/secret-scan/scans' },
        { name: changedImageName },
      ])
    );
    if (IS_NOTIFICATION_CHECK_ENABLE) {
      const interval = setInterval(() => { },
        NOTIFICATION_POLLING_DURATION * 1000);
      setIntervalObj(interval);
    }
  }, []);

  useEffect(() => {
    if (
      props.isLicenseActive &&
      !props.isLicenseExpired &&
      (props.licenseResponse.license_status === 'expired' ||
        props.licenseResponse.license_status === 'hosts_exceeded')
    ) {
      setIsLicenseExpiryModalVisible(true);
      setLicenseResponse(props.licenseResponse);
    } else {
      setIsLicenseExpiryModalVisible(false);
    }
  }, [props]);

  useEffect(
    () => () => {
      if (intervalObj) {
        clearInterval(intervalObj);
      }
      // Resetting table filters.
      dispatch(setActiveFilters(undefined, undefined));
    },
    []
  );

  if (redirectBack) {
    return <Redirect to={link} />;
  }
  const { match: { params: { scanId } = {} } = {} } = props;
  const unEscapedScanId = decodeURIComponent(scanId);

  const lastUnderscoreIndex = unEscapedScanId.lastIndexOf('_');
  const unEscapedImageName = unEscapedScanId.substring(0, lastUnderscoreIndex);
  const timeOfScanStr = unEscapedScanId.substring(lastUnderscoreIndex + 1);
  const timeOfScan = moment.utc(timeOfScanStr);

  const divClassName = classnames(
    { 'collapse-side-nav': isSideNavCollapsed },
    { 'expand-side-nav': !isSideNavCollapsed }
  );
  const contentClassName = classnames('content-header', {
    'with-filters': isFiltersViewVisible,
  });

  return (
    <div>
      <SideNavigation
        navMenuCollection={sideNavMenuCollection}
        activeMenu={activeMenu}
      />

      <div className={`vulnerability-view-wrapper cve-details ${divClassName}`}>
        <HeaderView />
        <div className={('vulnerability-table-scan-wrapper', contentClassName)}>
          <div className="">
            <div className="title vulnerability-scan-wrapper">
              Secret scan
              <div className="sub-title">
                {unEscapedImageName} (scanned {timeOfScan.fromNow()})
              </div>
            </div>
          </div>

          <SecretScanImageStatsContainer
            imageName={unEscapedImageName}
            scanId={unEscapedScanId}
          />
          <SecretScanChartView
            imageName={unEscapedImageName}
            scanId={unEscapedScanId}
          />
        </div>
        <div className="vulnerability-view-table-wrapper">
          <SecretScanTableV2
            imageName={unEscapedImageName}
            scanId={unEscapedScanId}
          />
        </div>
      </div>

      {isToasterVisible && <NotificationToaster />}
    </div>
  );
};

export default SecretScanResultsView;
