import React from 'react';
import { connect } from 'react-redux';
import SplunkIntegrationList from './list';

class SplunkIntegrationListContainer extends React.PureComponent {
  render() {
    const { splunkIntegrationList } = this.props;

    return (
      <SplunkIntegrationList
        {...this.props}
        splunkIntegrationList={splunkIntegrationList}
      />
    );
  }
}

function mapStateToProps(state) {
  return {
    splunkIntegrationList: state.get('availableSplunkIntegrations'),
  };
}

const connectedSplunkIntegrationListContainer = connect(mapStateToProps)(
  SplunkIntegrationListContainer
);

export default connectedSplunkIntegrationListContainer;
