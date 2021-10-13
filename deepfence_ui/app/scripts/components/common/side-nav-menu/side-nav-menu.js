/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';
import { Link, NavLink } from 'react-router-dom';
import {disableNotificationIcon, enableNotificationIcon} from "../../../actions/app-actions";
import {setSearchQuery} from '../../../actions/app-actions';

class SideNavMenu extends React.Component {

  constructor() {
    super();
    this.clearSearch = this.clearSearch.bind(this);
    this.state = {}
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    if (newProps.notificationsResponse && (newProps.notificationsResponse.critical_alerts > 0)) {
      this.props.dispatch(enableNotificationIcon());
    } else {
      this.props.dispatch(disableNotificationIcon());
    }
  }

  clearSearch(){
    this.props.dispatch(setSearchQuery({searchQuery:[]}))
  }

  selectedMenuHandle(menuName){
    this.clearSearch();
   localStorage.setItem('selectedMenuItem', menuName);
  }

  componentDidCatch(error, errorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    const showLabel = {
      opacity: '1'
    };
    const hideLabel = {
      opacity: '0'
    };
    const iconWrapperStyles = {
      display: 'flex'
    };
    const notificationDotStyles = {
      width: '5px',
      height: '5px',
      borderRadius: '50%',
      backgroundColor: '#00a9ff'
    };
    const integrationErrorCustomStyle = {
      position: 'absolute',
    };
      return (
        <NavLink onClick={() => {this.selectedMenuHandle(this.props.data.name)}} className='navigation-menu'  activeClassName="active" to={this.props.link} >
          <div className="menu-icon" style={iconWrapperStyles}>
            <i title={this.props.data.name} className={this.props.data.menuIcon} aria-hidden="true" />
            {(this.props.data.name == 'notification' && this.props.isNotificationIconEnable) && <span style={notificationDotStyles} />}
            {(this.props.data.name == 'Integrations' && this.props.integrationsAreFailing) && <i className="red-dot" style={integrationErrorCustomStyle} />}
          </div>
          <div className="menu-name" style={this.props.isSideNavCollapsed ? hideLabel : showLabel}>
            {this.props.data.name}
          </div>
        </NavLink>
      );
  }
}

function mapStateToProps(state) {
  return {
    notificationsResponse: state.get('notificationsResponse'),
    isNotificationIconEnable: state.get('isNotificationIconEnable'),
    isSideNavCollapsed: state.get('isSideNavCollapsed'),
    isNavbarActive: state.get('isNavbarActive'),
    isSelectedNavMenu: state.get('isSelectedMenu')
  };
}

export default connect(
  mapStateToProps
)(SideNavMenu);
