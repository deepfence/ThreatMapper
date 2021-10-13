import React from 'react';
import { connect } from 'react-redux';

import { MultiCloudTreeTable } from '../components/multi-cloud-table/multi-cloud-table';
import { DfDropDownMenu } from '../components/common/df-dropdown';
import { actionDropdownOptions } from './multi-cloud-action';
import { funnyTopologyTypeToModelType } from '../components/multi-cloud/LiveTopologyGraph';
import injectModalTrigger from '../components/common/generic-modal/modal-trigger-hoc';
import { getWebsocketUrl } from '../utils/web-api-utils';

class NodesGrid extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      showActions: false,
      items: [],
      options: [],
    };

    this.setAction = this.setAction.bind(this);
  }

  setAction(items) {
    const node_types = [];
    items.forEach(item => {
      const type = item.split(';', 2)[1];
      node_types.push(funnyTopologyTypeToModelType(type));
    });
    this.setState({
      showActions: items.length > 0,
      items,
      options: actionDropdownOptions(node_types),
    });
  }

  render() {
    const wsURL = `${getWebsocketUrl()}/topology-api`;
    const { showActions } = this.state;
    const { userProfile } = this.props;
    const apiKey = userProfile?.api_key;
    return (
      <div className="nodes-grid">
        {apiKey && (
          <div>
            <div className="multiselect-actions">
              <DfDropDownMenu
                selectedObjectIndex={this.state.items}
                options={this.state.options}
                label="Actions"
                triggerModal={this.props.triggerModal}
                alignment="right"
                dispatch={this.props.dispatch}
                disabled={!showActions}
              />
            </div>
            <MultiCloudTreeTable
              apiURL={wsURL}
              apiKey={apiKey}
              refreshInterval="5s"
              onNodeClicked={this.props.onNodeClicked}
              setAction={this.setAction}
            />
          </div>
        )}
      </div>
    );
  }
}
function mapStateToProps(state) {
  return {
    userProfile: state.get('userProfile'),
  };
}
export default injectModalTrigger(connect(mapStateToProps)(NodesGrid));
