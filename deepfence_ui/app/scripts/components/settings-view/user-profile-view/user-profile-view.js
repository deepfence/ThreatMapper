/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';
import {Map} from 'immutable';

// Custom component imports
import ChangePasswordView from './change-password-view';
import InviteView from './invite-view';
import UserList from './user-list';

import {
  fetchUserProfile,
  resetAPIKeyAction,
} from '../../../actions/app-actions';
import { EMPTY_STATE_TEXT } from '../../../constants/naming';
import AppLoader from '../../common/app-loader/app-loader';
import Loader from '../../loader';

class UserProfileView extends React.Component {
  constructor() {
    super();
    this.state = {
      isUserProfileFlow: false,
      isChangePasswordFlow: false,
      isInviteFlow: false,
      isEyeHidden: true
    };
    this.resetButtonHandler = this.resetButtonHandler.bind(this);
  }

  componentDidMount() {
    this.props.dispatch(fetchUserProfile());
    this.toggleView('profileView');
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    if (newProps.userProfile) {
      this.setState({
        userProfile: newProps.userProfile || this.props.userProfile
      });
    }
  }

  resetButtonHandler() {
    this.props.dispatch(resetAPIKeyAction()); 
  }

  toggleView(view) {
    if (view == 'profileView') {
      this.setState({
        isUserProfileFlow: true,
        isChangePasswordFlow: false,
        isInviteFlow: false
      });
    } else if (view == 'changePasswordFlow') {
      this.setState({
        isUserProfileFlow: false,
        isChangePasswordFlow: true,
        isInviteFlow: false
      });
    } else if (view == 'inviteFlow') {
      this.setState({
        isUserProfileFlow: false,
        isChangePasswordFlow: false,
        isInviteFlow: true
      });
    }
  }

  renderAPIKeyColumn() {
    const {userProfileMeta=Map(), userProfile} = this.props;
    if (userProfileMeta.get('loading')) {
      return (
        <div>
          <Loader small/>
        </div>
      )
    }
    return (
      <div>
          <div>
            <span> 
              {this.state.isEyeHidden ? "* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *" : userProfile.api_key}
            </span>
            <i className="fa fa-eye cursor ml-2" onClick = { () => this.setState(prevState => ({isEyeHidden: !prevState.isEyeHidden}))} />
            {!this.state.isEyeHidden && <button
              className="df-btn danger-btn pull-right mr-2"
              onClick={this.resetButtonHandler}
            >
              Reset Key
           </button>}
           {!this.state.isEyeHidden && <button
              className="df-btn primary-btn pull-right mr-2"
              onClick={ () =>  navigator.clipboard.writeText(userProfile.api_key)}
            >
              Copy Key
           </button>}
          </div>
        {userProfileMeta.get('error') && 
          <div className="error-message-small">
            {userProfileMeta.get('error')}
          </div>
        }
      </div>
    )
  }

  getUserProfileView() {
    return (
      <div className="user-details-wrapper">      
        <div className="col-sm-6 col-md-6 col-lg-6">
          <div className="user-details-row">
            <div className="user-details-key">First name</div>
            <div className="user-details-value">{this.state.userProfile.first_name}</div>
          </div>
          <div className="user-details-row">
            <div className="user-details-key">Last name</div>
            <div className="user-details-value">{this.state.userProfile.last_name}</div>
          </div>
          <div className="user-details-row">
            <div className="user-details-key">Email</div>
            <div className="user-details-value">{this.state.userProfile.email}</div>
          </div>
            <div className="user-details-row">
            <div className="user-details-key">Company</div>
            <div className="user-details-value">{this.state.userProfile.company}</div>
          </div>
          <div className="user-details-row">
            <div className="user-details-key">Role</div>
            <div className="user-details-value">{this.state.userProfile.role}</div>
          </div>
          <div className="user-details-row">
            <div className="user-details-key">API Key</div>
            <div className="user-details-value">
            {this.renderAPIKeyColumn()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  getProfileView() {
    return(
      <div className="user-profile-view-wrapper">
        <div className="profile-container">
          <div className="btn-container">
            <div className="col-md-6 col-lg-6 no-padding">
              <div className="btn-wrapper" style={{justifyContent: 'left'}}>
                { !this.state.isUserProfileFlow && <div className="go-back-btn" onClick={()=> this.toggleView('profileView')}>
                  <i className="fa fa-arrow-left" aria-hidden="true"></i> <span style={{paddingLeft: '5px', color: '#0276C9', fontSize: '15px'}}> Go Back</span>
                </div>}
              </div>
            </div>
            <div className="col-md-6 col-lg-6 no-padding">
              {this.state.isUserProfileFlow &&
              <div className="btn-wrapper">
                <div className="u-m-btn-change-password change-password-user-management" onClick={()=> this.toggleView('changePasswordFlow')}>Change Password</div>
                {this.state.userProfile.role == 'admin' && <div className="u-m-btn-send-invite" onClick={()=> this.toggleView('inviteFlow')}>Send Invite</div>}
              </div>}
            </div>
          </div>

          { this.state.isUserProfileFlow && this.getUserProfileView() }

          { this.state.isChangePasswordFlow && <ChangePasswordView /> }

          { this.state.isInviteFlow && <InviteView /> }

        </div>
      </div>
    );
  }

  getEmptyState(response) {
    const emptyStateWrapper = {
      height: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
    return(
      <div style={emptyStateWrapper}>
        { (response == undefined) ? <AppLoader /> : <div className='empty-state-text'>{ EMPTY_STATE_TEXT }</div> }
      </div>
    );
  }

  checkDataAvailabilityStatus(data) {
    let isAvailable;
    if (data && typeof data == 'object') {
      isAvailable = true;
    } else {
      isAvailable = false;
    }
    return isAvailable;
  }

  render() {
    return (
      <div>
        { this.checkDataAvailabilityStatus(this.state.userProfile) ? this.getProfileView() : this.getEmptyState(this.state.userProfile) }
        <UserList />
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    userProfile: state.get('userProfile'),
    userProfileMeta: state.get('userProfileMeta'),
  };
}

export default connect(
  mapStateToProps
)(UserProfileView);
