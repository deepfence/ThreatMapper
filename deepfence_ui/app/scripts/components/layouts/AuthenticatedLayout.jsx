import React from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';
import {
  ADMIN_SIDE_NAV_MENU_COLLECTION,
  USER_SIDE_NAV_MENU_COLLECTION,
} from '../../constants/menu-collection';
import { getUserRole } from '../../helpers/auth-helper';
import SideNavigation from '../common/side-navigation/side-navigation';
import HeaderView from '../common/header-view/header-view';

export const AuthenticatedLayout = ({ children, hideLuceneQuery }) => {
  const navMenuCollection =
    getUserRole() === 'admin'
      ? ADMIN_SIDE_NAV_MENU_COLLECTION
      : USER_SIDE_NAV_MENU_COLLECTION;

  const { isFiltersViewVisible, isSideNavCollapsed } = useSelector(state => {
    return {
      isSideNavCollapsed: state.get('isSideNavCollapsed'),
      isFiltersViewVisible: state.get('isFiltersViewVisible'),
    };
  });

  const contentClassName = classNames({
    'collapse-side-nav': isSideNavCollapsed,
    'expand-side-nav': !isSideNavCollapsed,
    'show-filters-view': isFiltersViewVisible,
    'hide-filters-view': !isFiltersViewVisible,
  });

  return (
    <div>
      <SideNavigation
        navMenuCollection={navMenuCollection}
        activeMenu={navMenuCollection[0]}
      />
      <div>
        <HeaderView hideLuceneQuery={hideLuceneQuery} />
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
};
