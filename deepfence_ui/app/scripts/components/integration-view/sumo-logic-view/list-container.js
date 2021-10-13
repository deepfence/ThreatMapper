/* eslint-disable import/no-cycle */
import React from 'react';
import { connect } from 'react-redux';
import SumoLogicList from './list';

class SumoLogicListContainer extends React.PureComponent {
  render() {
    const { sumoLogicList } = this.props;

    return (
      <SumoLogicList
        {...this.props}
        sumoLogicList={sumoLogicList}
      />
    );
  }
}

function mapStateToProps(state) {
  return {
    sumoLogicList: state.get('availableSumoLogicIntegrations'),
  };
}

const connectedSumoLogicListContainer = connect(mapStateToProps)(
  SumoLogicListContainer
);

export default connectedSumoLogicListContainer;
