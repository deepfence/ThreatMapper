/* eslint-disable no-nested-ternary */
import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Redirect, Route, HashRouter, Switch } from 'react-router-dom';

// Custom components
import TableJSONViewModal from './common/table-json-view-modal/table-json-view-modal';
import DFModal from './common/modal/index';
import EULAView from './common/eula-view/eula-view';

import TopologyView from './topology-view/topology-view';
import VulnerabilityView from './vulnerability-view/index';
import CVEDetailsView from './vulnerability-view/vulnerability-view';
import SecretScanHome from './secret-scan-view/index';
import SecretScanResultsView from './secret-scan-view/secret-scan-results-view';
import NotificationsView from './notification-view/notification-view';
import SettingsView from './settings-view/settings-view';
import RegistryVulnerabilityScan from './vulnerability-view/registry-scan/index';
import { ComplianceViewHome } from './compliance-view';
import ComplianceDetailsView from './compliance-view/details';
import ComplianceSummary from './compliance-view/compliance-summary';
import { InventoryServiceResourceView } from './inventory/service-resources';
import { InventoryServicesView } from './inventory/services';
import { AttackGraph } from './attack-graph';
import MalwareScanHome from './malware-scan-view/index';
import MalwareScanResultsView from './malware-scan-view/malware-scan-results-view';
import MalwareClassesResultsView from './malware-scan-view/malware-classes-results-view';

import LoginView from './auth-module/login-view/login-view';
import RegisterView from './auth-module/register-view/register-view';
import ForgotPasswordView from './auth-module/forgot-password-view/forgot-password-view';
import ResetPasswordView from './auth-module/reset-password-view/reset-password-view';
import RegisterViaInviteView from './auth-module/register-via-invite-view/register-via-invite-view';
import changePasswordView from './settings-view/user-profile-view/change-password-view';
import { isPasswordInvalidated, isUserSessionActive, isUserSessionActiveAsync } from '../helpers/auth-helper';
import Loader from './loader';
import { SingleComplianceResult } from './compliance-view/single-result';


const PrivateRoute = ({ component: Component, ...rest }) => {
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isUserSessionActive, setIsUserSessionActive] = useState(false);


  useEffect(() => {
    isUserSessionActiveAsync().then((active) => {
      setIsUserSessionActive(active);
      setIsAuthLoading(false);
    });
  }, []);

  return <Route
    {...rest}
    render={props => {
      const currentPath = props?.location?.pathname ?? '';

      if (isAuthLoading) {
        return <div style={{ marginTop: '400px' }}><Loader /></div>
      }

      if (isPasswordInvalidated() && currentPath !== '/change-password') {
        return <Redirect to="/change-password" />
      }

      return isUserSessionActive ? (
        <Component {...props} />
      ) : (
        <Redirect to="/login" />
      )
    }}
  />
}

class DeepFenceApp extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  render() {
    const { isTableJSONViewModal } = this.props;
    return (
      <div className="dashboard-wrapper">
        <HashRouter>
          <Switch>
            <Route
              path="/login"
              render={() =>
                isUserSessionActive() ? (
                  <Redirect to="/topology" />
                ) : (
                  <LoginView />
                )
              }
            />
            <Route
              path="/register"
              render={() =>
                isUserSessionActive() ? (
                  <Redirect to="/topology" />
                ) : (
                  <RegisterView />
                )
              }
            />
            <Route
              path="/forgot-password"
              render={() =>
                isUserSessionActive() ? (
                  <Redirect to="/topology" />
                ) : (
                  <ForgotPasswordView />
                )
              }
            />
            <Route
              path="/password-reset"
              render={() =>
                isUserSessionActive() ? (
                  <Redirect to="/topology" />
                ) : (
                  <ResetPasswordView />
                )
              }
            />
            <Route
              path="/invite-accept"
              render={() =>
                isUserSessionActive() ? (
                  <Redirect to="/topology" />
                ) : (
                  <RegisterViaInviteView />
                )
              }
            />
            <Route
              path="/user-agreement"
              target="_blank"
              render={(props) => <EULAView {...props} />}
            />

            <PrivateRoute path="/topology" component={TopologyView} />
            <PrivateRoute
              path="/vulnerability/details/:scanId/:scanName"
              component={CVEDetailsView}
            />
            <PrivateRoute
              path="/secret-scan/details/:scanId"
              component={SecretScanResultsView}
            />
            <PrivateRoute path="/vulnerability" component={VulnerabilityView} />
            <PrivateRoute path="/secret-scan" component={SecretScanHome} />
            <PrivateRoute
              path="/registry_vulnerability_scan"
              component={RegistryVulnerabilityScan}
            />
            <PrivateRoute path="/notification" component={NotificationsView} />
            <PrivateRoute path="/settings" component={SettingsView} />
            <PrivateRoute path="/change-password" component={changePasswordView} />

            <PrivateRoute path="/:complianceType(compliance|cloud-compliance)?/result/:docId" component={SingleComplianceResult} />
            <PrivateRoute
              path="/compliance/summary/:nodeId/:checkType/:scanId/:scanType"
              component={ComplianceDetailsView}
            />
            <PrivateRoute
              path="/compliance/cloud-inventory/:cloudtype/:nodeid/:serviceid"
              component={InventoryServiceResourceView}
            />
            <PrivateRoute
              path="/compliance/cloud-inventory/:cloudtype/:nodeid"
              component={InventoryServicesView}
            />
            <PrivateRoute path="/compliance/:cloudtype/:nodeid/:checkType" component={ComplianceSummary} />
            <PrivateRoute path="/compliance" component={ComplianceViewHome} />
            <PrivateRoute path="/threat-graph" component={AttackGraph} />
            <PrivateRoute
              path="/malware-scan/details/:scanId"
              component={MalwareScanResultsView}
            />
            <PrivateRoute
              path="/malware-scan/details/:scanId"
              component={MalwareClassesResultsView}
            />
            <PrivateRoute path="/malware-scan" component={MalwareScanHome} />
            <Route
              path="*"
              render={() =>
                isUserSessionActive() ? (
                  <Redirect to="/topology" />
                ) : (
                  <Redirect to="/login" />
                )
              }
            />
          </Switch>
        </HashRouter>

        {isTableJSONViewModal && <TableJSONViewModal eventTypes={['click']} />}
        <DFModal />
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    isTableJSONViewModal: state.get('isTableJSONViewModal'),
  };
}

export default connect(mapStateToProps)(DeepFenceApp);
