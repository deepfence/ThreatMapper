/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { Route, withRouter, Redirect } from 'react-router';
import { CloudTableView } from '../components/topology-filter-view/cloud-view/cloud-view-table';
import { HostTableView } from '../components/topology-filter-view/host-view/host-table-view';
import { K8sTableView } from '../components/topology-filter-view/k8s-view/k8s-table-view';

const menu = [
  {
    id: 'cloud',
    displayName: 'Multi Cloud view',
    component: CloudTableView,
  },
  {
    id: 'hosts',
    displayName: 'Host View',
    component: HostTableView,
  },
  {
    id: 'k8s',
    displayName: 'K8s View',
    component: K8sTableView,
  },
];

export const NodesGrid = withRouter(({ onNodeClicked, match }) => (
  <div className="">
    {menu.map(menuItem => (
      <Route
        key={menuItem.id}
        exact
        path={`${match.path}/${menuItem.id}`}
        render={() => (
          <menuItem.component
            onNodeClicked={onNodeClicked}
            //  showPanelForNode={showPanelForNode}
          />
        )}
      />
    ))}
    <Route
      exact
      path={match.path}
      render={() => <Redirect to={`${match.url}/${menu[0].id}`} />}
    />
  </div>
));
