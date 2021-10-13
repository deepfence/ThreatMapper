/* eslint-disable react/no-array-index-key */
import React from 'react';
import {connect} from 'react-redux';
import {
  getRunningNotificationAction,
} from '../../../actions/app-actions';
import pollable from './pollable';

class RunningNotification extends React.PureComponent {
  constructor(props) {
    super(props);
    this.getRunningNotification = this.getRunningNotification.bind(this);
  }

  getRunningNotification() {
    const {
      getRunningNotificationAction: action,
    } = this.props;
    return action();
  }

  componentDidMount() {
    const {
      registerPolling,
      startPolling,
    } = this.props;
    registerPolling(this.getRunningNotification);
    return startPolling();
  }

  render() {
    const {
      runningNotifications = [],
    } = this.props;

    let contentList = [];
    let visibleNotifications = [];
    if (runningNotifications) {
      visibleNotifications = runningNotifications.filter(notification => notification.content);
      contentList = visibleNotifications.map(notification => notification.content);
    }

    if (contentList.length === 0) {
      return null;
    }

    return (
      <div className="running-notification-root">
        {visibleNotifications.map((notification, index) => (
          <div className="notification" key={index}>
            {notification.classname && <div className={notification.classname} />}
            {notification.content}
          </div>
        ))}
      </div>
    );
  }
}

const pollableRunningNotification = pollable()(RunningNotification);
const mapStateToProps = state => ({
  runningNotifications: state.get('running_notifications'),
});
export default connect(mapStateToProps, {
  getRunningNotificationAction,
})(pollableRunningNotification);
