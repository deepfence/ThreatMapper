import React  from 'react';
import { Route, Redirect, withRouter } from 'react-router-dom';
import { CloudView } from '../components/topology-filter-view/cloud-view/cloud-view';
import { HostView } from '../components/topology-filter-view/host-view/host-view';
import { K8sView } from '../components/topology-filter-view/k8s-view/k8s-view';

const menu = [
  {
    id: 'cloud',
    displayName: 'Multi Cloud view',
    component: CloudView,
  },
  {
    id: 'hosts',
    displayName: 'Host View',
    component: HostView,
  },
  {
    id: 'k8s',
    displayName: 'K8s View',
    component: K8sView,
  },
];

const NodesChart = withRouter(({ onNodeClicked, match }) => (
    <div className="">
      {menu.map(menuItem => (
        <Route
          key={menuItem.id}
          exact
          path={`${match.path}/${menuItem.id}`}
          render={() => 
            <menuItem.component
             onNodeClicked={onNodeClicked}
             showPanelForNode={showPanelForNode}
            />
          }
        />
      ))}
      <Route
        exact
        path={match.path}
        render={() => <Redirect to={`${match.url}/${menu[0].id}`} />}
      />
    </div>));

const showPanelForNode = node => {
  const type = node.id.split(';', 2)[1];
  switch (type) {
    case '<cloud_provider>':
    case '<kubernetes_cluster>':
      return false;
    default:
      return true;
  }
};

export default NodesChart;
