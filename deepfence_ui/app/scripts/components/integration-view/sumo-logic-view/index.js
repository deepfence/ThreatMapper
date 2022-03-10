import React from 'react';
import SumoLogicListContainer from './list-container';
import SumoLogicForm from './add-form';

const SumoLogicView = () => (
  <div className="email-integration-view-wrapper">
    <SumoLogicForm />
    <SumoLogicListContainer />
  </div>
);

export default SumoLogicView;
