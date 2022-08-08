import React from 'react';
import classnames from 'classnames';
import { Route, Link, withRouter, Redirect } from 'react-router-dom';
import { useSelector } from 'react-redux';

import AWS_LOGO from '../../../images/AWS_logo_dark.png';
import AZURE_LOGO from '../../../images/azure.png';
import GCP_LOGO from '../../../images/gcp.png';
import LINUX_LOGO from '../../../images/linux.png';
import K8S_LOGO from '../../../images/k8s.png';

import { AwsTerraFormScript } from './aws-scripts';
import { AzureTerraFormScript } from './azure-scripts';
import { GcpTerraFormScript } from './gcp-scripts';
import { LinuxTerraFormScript } from './linux-scripts';
import { K8sTerraFormScript } from './k8s-scripts';

import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import NotificationToaster from '../common/notification-toaster/notification-toaster';

const menu = [
  {
    id: 'aws',
    displayName: 'AWS',
    image: AWS_LOGO,
    component: AwsTerraFormScript,
  },
  {
    id: 'gcp',
    displayName: 'Google Cloud',
    image: GCP_LOGO,
    component: GcpTerraFormScript,
  },
  {
    id: 'azure',
    displayName: 'Azure',
    image: AZURE_LOGO,
    component: AzureTerraFormScript,
  },
  {
    id: 'kubernetes',
    displayName: 'Kubernetes',
    image: K8S_LOGO,
    component: K8sTerraFormScript,
  },
  {
    id: 'linux',
    displayName: 'Linux host',
    image: LINUX_LOGO,
    component: LinuxTerraFormScript,
  },
];

export const ComplianceViewHome = withRouter(match => {

  const { isToasterVisible } = useSelector((state) => {
    return {
      isToasterVisible: state.get('isToasterVisible'),
    };
  })

  return (
    <AuthenticatedLayout>
      <div
        className="tab-links"
      >
        <div className="df-tabs">
          <div className="tabheading">
            <ul>
              {menu.map(menuItem => (
                <Route
                  key={menuItem.id}
                  path={`${match.match.path}/${menuItem.id}`}
                >
                  {({ match: linkMatch }) => (
                    <>
                      <li
                        key={menuItem.id}
                        className={classnames('tab', { active: linkMatch })}
                      >
                        <Link to={`${match.match.url}/${menuItem.id}`}>
                          <img
                            src={menuItem.image}
                            alt="breadcrumb"
                            style={{ marginRight: '10px', width: '34px' }}
                          />
                          {menuItem.displayName}
                        </Link>
                      </li>
                    </>
                  )}
                </Route>
              ))}
            </ul>
          </div>
        </div>
        {menu.map(menuItem => (
          <Route
            key={menuItem.id}
            exact
            path={`${match.match.path}/${menuItem.id}`}
            render={props => <menuItem.component {...props} />}
          />
        ))}
        <Route
          exact
          path={match.match.path}
          render={() => <Redirect to={`${match.match.url}/${menu[0].id}`} />}
        />
        {isToasterVisible && <NotificationToaster />}
      </div>
    </AuthenticatedLayout>
  );
});
