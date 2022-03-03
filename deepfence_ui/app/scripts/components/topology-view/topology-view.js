/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';
// Custom component imports
import HeaderView from '../common/header-view/header-view';
import { ScopeView } from '../common/scope-view/scope-view';
import NotificationToaster from '../common/notification-toaster/notification-toaster';

import {fetchUserProfile, setActiveFilters, breadcrumbChange, addGlobalSettingsAction, getGlobalSettingsAction} from '../../actions/app-actions';
import {
  IS_NOTIFICATION_CHECK_ENABLE, NOTIFICATION_POLLING_DURATION
} from '../../constants/visualization-config';
import { getBackendBasePath} from '../../utils/web-api-utils';

class TopologyView extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  componentDidMount() {
    this.props.dispatch(fetchUserProfile());
    this.props.dispatch(breadcrumbChange([{name: 'Topology'}]));
    this.props.dispatch(getGlobalSettingsAction());
    this.globalSettingsChange();
  }

  UNSAFE_componentWillReceiveProps(newProps){
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

  componentWillUnmount(){
    if(this.state.intervalObj){
      clearInterval(this.state.intervalObj);
    }
    this.props.dispatch(setActiveFilters(undefined, undefined));
  }

  globalSettingsChange() {
    const { settingList } = this.props;
    const baseUrl = getBackendBasePath();
    const url = baseUrl.split('//');
    if (settingList && settingList[0].value.length === 0) {
      const params = {
        key: 'console_url',
        value: url[1],
      };
      this.props.dispatch(addGlobalSettingsAction(params));
    }
  }

  render() {
    const { isLicenseExpiryModalVisible } = this.state;

    const { isToasterVisible, toggleFullView } = this.props;

    return (
      <div className="topology-view-wrapper">
        <div ref={'resizeRef'} style={{overflow: 'hidden'}}>
            <HeaderView />
        </div>
        <ScopeView />
        { isToasterVisible && <NotificationToaster /> }
      </div>
    );
  }

}

function mapStateToProps(state) {
  return {
    nodes: state.get('nodes'),
    hosts: state.get('hosts'),
    topologyId: state.get('currentTopologyId'),
    isToasterVisible: state.get('isToasterVisible'),
    toggleFullView:state.get('toggleFullWindow'),
    settingList: state.get('global_settings')
  };
}
export default connect(
  mapStateToProps
)(TopologyView);
