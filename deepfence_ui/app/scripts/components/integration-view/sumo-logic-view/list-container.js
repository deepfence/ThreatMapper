import React from 'react';
import { useSelector } from 'react-redux';
import SumoLogicList from './list';

const SumoLogicListContainer = props => {
  const sumoLogicList = useSelector(state =>
    state.get('availableSumoLogicIntegrations')
  );
  return <SumoLogicList {...props} sumoLogicList={sumoLogicList} />;
};

const connectedSumoLogicListContainer = SumoLogicListContainer;

export default connectedSumoLogicListContainer;
