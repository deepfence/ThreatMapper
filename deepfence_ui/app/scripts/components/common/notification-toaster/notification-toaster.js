/*eslint-disable*/

import React from 'react';
import { connect } from 'react-redux';

import { hideToaster } from '../../../actions/app-actions';

class NotificationToaster extends React.Component {
  constructor() {
    super();
  }

  componentDidMount(){
    this.hide();
  }

  hide() {
    setTimeout(()=> {
      this.props.dispatch(hideToaster());
    }, 3000);
  }

  render() {
    const { notificationText } = this.props;
    return (
      <div id='toaster'>
        { notificationText }
      </div>
    )
  }
}

function mapStateToProps(state) {
  return {
    notificationText: state.get('toasterNotificationText'),
  };
}

export default connect(
  mapStateToProps
)(NotificationToaster);
