/*eslint-disable*/

// React imports
import React, { useEffect, useState, useRef } from 'react';
import { connect } from 'react-redux';
import { Map } from 'immutable';

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

const UserProfileView = props => {
  const [isUserProfileFlow, setIsUserProfileFlow] = useState(false);
  const [isChangePasswordFlow, setIsChangePasswordFlow] = useState(false);
  const [isInviteFlow, setIsInviteFlow] = useState(false);
  const [isEyeHidden, setIsEyeHidden] = useState(true);

  useEffect(() => {
    props.dispatch(fetchUserProfile());
    toggleView('profileView');
  }, []);

  const resetButtonHandler = () => {
    props.dispatch(resetAPIKeyAction());
  };

  const toggleView = view => {
    if (view == 'profileView') {
      setIsUserProfileFlow(true);
      setIsChangePasswordFlow(false);
      setIsInviteFlow(false);
    } else if (view == 'changePasswordFlow') {
      setIsUserProfileFlow(false);
      setIsChangePasswordFlow(true);
      setIsInviteFlow(false);
    } else if (view == 'inviteFlow') {
      setIsUserProfileFlow(false);
      setIsChangePasswordFlow(false);
      setIsInviteFlow(true);
    }
  };

  const renderAPIKeyColumn = () => {
    const { userProfileMeta = Map(), userProfile } = props;
    if (userProfileMeta.get('loading')) {
      return (
        <div>
          <Loader small />
        </div>
      );
    }
    return (
      <div>
        <div>
          <span>
            {isEyeHidden
              ? '* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *'
              : userProfile.api_key}
          </span>
          <i
            className="fa fa-eye cursor ml-2"
            onClick={() => setIsEyeHidden(!isEyeHidden)}
          />
          {!isEyeHidden && (
            <button
              className="df-btn danger-btn pull-right mr-2"
              onClick={() => resetButtonHandler()}
            >
              Reset Key
            </button>
          )}
          {!isEyeHidden && (
            <button
              className="df-btn primary-btn pull-right mr-2"
              onClick={() => navigator.clipboard.writeText(userProfile.api_key)}
            >
              Copy Key
            </button>
          )}
        </div>
        {userProfileMeta.get('error') && (
          <div className="error-message-small">
            {userProfileMeta.get('error')}
          </div>
        )}
      </div>
    );
  };

  const getUserProfileView = () => {
    return (
      <div className="user-details-wrapper">
        <div className="col-sm-6 col-md-6 col-lg-6">
          <div className="user-details-row">
            <div className="user-details-key">First name</div>
            <div className="user-details-value">
              {props.userProfile.first_name}
            </div>
          </div>
          <div className="user-details-row">
            <div className="user-details-key">Last name</div>
            <div className="user-details-value">
              {props.userProfile.last_name}
            </div>
          </div>
          <div className="user-details-row">
            <div className="user-details-key">Email</div>
            <div className="user-details-value">{props.userProfile.email}</div>
          </div>
          <div className="user-details-row">
            <div className="user-details-key">Company</div>
            <div className="user-details-value">
              {props.userProfile.company}
            </div>
          </div>
          <div className="user-details-row">
            <div className="user-details-key">Role</div>
            <div className="user-details-value">{props.userProfile.role}</div>
          </div>
          <div className="user-details-row">
            <div className="user-details-key">API Key</div>
            <div className="user-details-value">{renderAPIKeyColumn()}</div>
          </div>
        </div>
      </div>
    );
  };

  const getProfileView = () => {
    return (
      <div className="user-profile-view-wrapper">
        <div className="profile-container">
          <div className="btn-container">
            <div className="col-md-6 col-lg-6 no-padding">
              <div className="btn-wrapper" style={{ justifyContent: 'left' }}>
                {!isUserProfileFlow && (
                  <div
                    className="go-back-btn"
                    onClick={() => toggleView('profileView')}
                  >
                    <i className="fa fa-arrow-left" aria-hidden="true"></i>{' '}
                    <span
                      style={{
                        paddingLeft: '5px',
                        color: '#0276C9',
                        fontSize: '15px',
                      }}
                    >
                      {' '}
                      Go Back
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-6 col-lg-6 no-padding">
              {isUserProfileFlow && (
                <div className="btn-wrapper">
                  <div
                    className="u-m-btn-change-password change-password-user-management"
                    onClick={() => toggleView('changePasswordFlow')}
                  >
                    Change Password
                  </div>
                  {props.userProfile.role == 'admin' && (
                    <div
                      className="u-m-btn-send-invite"
                      onClick={() => toggleView('inviteFlow')}
                    >
                      Send Invite
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {isUserProfileFlow && getUserProfileView()}

          {isChangePasswordFlow && <ChangePasswordView />}

          {isInviteFlow && <InviteView />}
        </div>
      </div>
    );
  };

  const getEmptyState = response => {
    const emptyStateWrapper = {
      height: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
    return (
      <div style={emptyStateWrapper}>
        {response == undefined ? (
          <AppLoader />
        ) : (
          <div className="empty-state-text">{EMPTY_STATE_TEXT}</div>
        )}
      </div>
    );
  };

  const checkDataAvailabilityStatus = data => {
    let isAvailable;
    if (data && typeof data == 'object') {
      isAvailable = true;
    } else {
      isAvailable = false;
    }
    return isAvailable;
  };

  return (
    <div>
      {checkDataAvailabilityStatus(props.userProfile)
        ? getProfileView()
        : getEmptyState(props.userProfile)}
      <UserList />
    </div>
  );
};

const mapStateToProps = state => ({
  userProfile: state.get('userProfile'),
  userProfileMeta: state.get('userProfileMeta'),
});

export default connect(mapStateToProps)(UserProfileView);
