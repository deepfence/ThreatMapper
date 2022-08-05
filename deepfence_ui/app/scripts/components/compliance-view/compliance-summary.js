/* eslint-disable react/no-children-prop */
import React from 'react';
import { Route, Link, Redirect } from 'react-router-dom';
import classnames from 'classnames';
import { connect } from 'react-redux';

import SideNavigation from '../common/side-navigation/side-navigation';
import HeaderView from '../common/header-view/header-view';
import {
  ADMIN_SIDE_NAV_MENU_COLLECTION,
  USER_SIDE_NAV_MENU_COLLECTION,
} from '../../constants/menu-collection';
import { getUserRole } from '../../helpers/auth-helper';
import {
  AWSComplianceViewMenu,
  GCPComplianceViewMenu,
  AzureComplianceViewMenu,
  LinuxComplianceViewMenu,
  KubernetesComplianceViewMenu,
} from './menu';

class ComplianceSummary extends React.PureComponent {
  constructor(props) {
    super(props);
    this.sideNavMenuCollection =
      getUserRole() === 'admin'
        ? ADMIN_SIDE_NAV_MENU_COLLECTION
        : USER_SIDE_NAV_MENU_COLLECTION;
    this.state = {
      activeMenu: this.sideNavMenuCollection[0],
    };
  }

  render() {
    const { match, isSideNavCollapsed, isFiltersViewVisible } = this.props;
    const divClassName = classnames({
      'collapse-side-nav': isSideNavCollapsed,
      'expand-side-nav': !isSideNavCollapsed,
      'show-filters-view': isFiltersViewVisible,
      'hide-filters-view': !isFiltersViewVisible,
    });
    const contentClassName = classnames(
      'summary',
      { 'collapse-side-nav': isSideNavCollapsed },
      { 'expand-side-nav': !isSideNavCollapsed }
    );
    return (
      <div className="compliance-summary-view">
        <SideNavigation
          navMenuCollection={this.sideNavMenuCollection}
          activeMenu={this.state.activeMenu}
        />
        <div style={{ overflow: 'hidden' }}>
          <HeaderView />
          <div className={divClassName} />
        </div>
        <div
          className="go-back-btn"
          onClick={() =>
            this.props.history.push(`/compliance/${match.params.cloudtype}`)
          }
          style={{
            marginBottom: '8px',
            marginLeft: '100px',
            width: 'fit-content',
            cursor: 'pointer',
          }}
        >
          <i className="fa fa-arrow-left" aria-hidden="true" />{' '}
          <span
            style={{ paddingLeft: '5px', color: '#0276C9', fontSize: '15px' }}
          >
            {' '}
            Go Back
          </span>
        </div>
        <div className={contentClassName}>
          <div className="df-tabs">
            <div className="tabheading">
              {match.params.cloudtype === 'aws' && (
                <ul>
                  {AWSComplianceViewMenu.map(complianceView => (
                    <Route
                      key={complianceView.id}
                      path={`${match.path}/${complianceView.id}`}
                      children={({ match: linkMatch }) => (
                        <li
                          key={complianceView.id}
                          className={classnames('tab', { active: linkMatch })}
                        >
                          <Link to={`${match.url}/${complianceView.id}`}>
                            {complianceView.displayName}
                          </Link>
                        </li>
                      )}
                    />
                  ))}
                </ul>
              )}
              {match.params.cloudtype === 'gcp' && (
                <ul>
                  {GCPComplianceViewMenu.map(complianceView => (
                    <Route
                      key={complianceView.id}
                      path={`${match.path}/${complianceView.id}`}
                      children={({ match: linkMatch }) => (
                        <li
                          key={complianceView.id}
                          className={classnames('tab', { active: linkMatch })}
                        >
                          <Link to={`${match.url}/${complianceView.id}`}>
                            {complianceView.displayName}
                          </Link>
                        </li>
                      )}
                    />
                  ))}
                </ul>
              )}
              {match.params.cloudtype === 'azure' && (
                <ul>
                  {AzureComplianceViewMenu.map(complianceView => (
                    <Route
                      key={complianceView.id}
                      path={`${match.path}/${complianceView.id}`}
                      children={({ match: linkMatch }) => (
                        <li
                          key={complianceView.id}
                          className={classnames('tab', { active: linkMatch })}
                        >
                          <Link to={`${match.url}/${complianceView.id}`}>
                            {complianceView.displayName}
                          </Link>
                        </li>
                      )}
                    />
                  ))}
                </ul>
              )}
              {match.params.cloudtype === 'linux' && (
                <ul>
                  {LinuxComplianceViewMenu.map(complianceView => (
                    <Route
                      key={complianceView.id}
                      path={`${match.path}/${complianceView.id}`}
                      children={({ match: linkMatch }) => (
                        <li
                          key={complianceView.id}
                          className={classnames('tab', { active: linkMatch })}
                        >
                          <Link to={`${match.url}/${complianceView.id}`}>
                            {complianceView.displayName}
                          </Link>
                        </li>
                      )}
                    />
                  ))}
                </ul>
              )}
              {match.params.cloudtype === 'kubernetes' && (
                <ul>
                  {KubernetesComplianceViewMenu.map(complianceView => (
                    <Route
                      key={complianceView.id}
                      path={`${match.path}/${complianceView.id}`}
                      children={({ match: linkMatch }) => (
                        <li
                          key={complianceView.id}
                          className={classnames('tab', { active: linkMatch })}
                        >
                          <Link to={`${match.url}/${complianceView.id}`}>
                            {complianceView.displayName}
                          </Link>
                        </li>
                      )}
                    />
                  ))}
                </ul>
              )}
            </div>
            {match.params.cloudtype === 'aws' &&
              AWSComplianceViewMenu.map(complianceView => (
                <Route
                  key={complianceView.id}
                  exact
                  path={`${match.path}/${complianceView.id}`}
                  render={props => <complianceView.component {...props} />}
                />
              ))}
            {match.params.cloudtype === 'gcp' &&
              GCPComplianceViewMenu.map(complianceView => (
                <Route
                  key={complianceView.id}
                  exact
                  path={`${match.path}/${complianceView.id}`}
                  render={props => <complianceView.component {...props} />}
                />
              ))}
            {match.params.cloudtype === 'azure' &&
              AzureComplianceViewMenu.map(complianceView => (
                <Route
                  key={complianceView.id}
                  exact
                  path={`${match.path}/${complianceView.id}`}
                  render={props => <complianceView.component {...props} />}
                />
              ))}
            {match.params.cloudtype === 'linux' &&
              LinuxComplianceViewMenu.map(complianceView => (
                <Route
                  key={complianceView.id}
                  exact
                  path={`${match.path}/${complianceView.id}`}
                  render={props => <complianceView.component {...props} />}
                />
              ))}
            {match.params.cloudtype === 'kubernetes' &&
              KubernetesComplianceViewMenu.map(complianceView => (
                <Route
                  key={complianceView.id}
                  exact
                  path={`${match.path}/${complianceView.id}`}
                  render={props => <complianceView.component {...props} />}
                />
              ))}
            {match.params.cloudtype === 'aws' && (
              <Route
                exact
                path={match.path}
                render={() => (
                  <Redirect
                    to={`${match.url}/${AWSComplianceViewMenu[0].id}`}
                  />
                )}
              />
            )}
            {match.params.cloudtype === 'gcp' && (
              <Route
                exact
                path={match.path}
                render={() => (
                  <Redirect
                    to={`${match.url}/${GCPComplianceViewMenu[0].id}`}
                  />
                )}
              />
            )}
            {match.params.cloudtype === 'azure' && (
              <Route
                exact
                path={match.path}
                render={() => (
                  <Redirect
                    to={`${match.url}/${AzureComplianceViewMenu[0].id}`}
                  />
                )}
              />
            )}
            {match.params.cloudtype === 'linux' && (
              <Route
                exact
                path={match.path}
                render={() => (
                  <Redirect
                    to={`${match.url}/${LinuxComplianceViewMenu[0].id}`}
                  />
                )}
              />
            )}
            {match.params.cloudtype === 'kubernetes' && (
              <Route
                exact
                path={match.path}
                render={() => (
                  <Redirect
                    to={`${match.url}/${KubernetesComplianceViewMenu[0].id}`}
                  />
                )}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    isSideNavCollapsed: state.get('isSideNavCollapsed'),
    isFiltersViewVisible: state.get('isFiltersViewVisible'),
  };
}

export default connect(mapStateToProps)(ComplianceSummary);
