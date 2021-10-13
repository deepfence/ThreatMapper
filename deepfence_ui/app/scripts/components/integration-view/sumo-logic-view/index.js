import React from 'react';
import SumoLogicListContainer from './list-container';
import SumoLogicForm from './add-form';

class SumoLogicView extends React.PureComponent {
  render() {
    return (
      <div className="email-integration-view-wrapper">
        <SumoLogicForm />
        <SumoLogicListContainer />
      </div>
    );
  }
}

export default SumoLogicView;
