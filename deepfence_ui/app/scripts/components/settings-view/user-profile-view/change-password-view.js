/*eslint-disable*/

// React imports
import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';

import {
  logoutUser,
  requestPasswordChange,
} from '../../../actions/app-actions';

const ChangePasswordView = props => {
  const [old_password, setOld_password] = useState('');
  const [new_password, setNew_password] = useState('');
  const [confirm_password, setConfirm_password] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [responseMsg, setResponseMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState('');
  const [isError, setIsError] = useState('');

  useEffect(() => {
    setResponseMsg(props.responseMsg);
    setIsSuccess(props.isSuccess);
    setIsError(props.isError);
  }, [props.isSuccess && !props.isError]);

  useEffect(() => {
    setResponseMsg(props.responseMsg);
    setIsSuccess(props.isSuccess);
    setIsError(props.isError);
  }, [!props.isSuccess && props.isError]);

  const oldPasswordChange = e => {
    const { value } = e.target;
    setOld_password(value);
  };

  const newPasswordChange = e => {
    const { value } = e.target;
    setNew_password(value);
  };

  const confirmPasswordChange = e => {
    const { value } = e.target;
    setConfirm_password(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (old_password && new_password && confirm_password) {
      let params = {
        old_password: old_password,
        password: new_password,
        confirm_password: confirm_password,
      };
      props.dispatch(requestPasswordChange(params));
      setTimeout(() => {
        this.props.dispatch(logoutUser());
      }, 2000);
    }
  };

  return (
    <div className="change-password-view-wrapper">
      <div className="change-password-form-wrapper">
        <div className="form-heading" style={{ marginBottom: '20px' }}>
          Change your password
        </div>
        <form name="form" onSubmit={(e) => handleSubmit(e)}>
          <div
            className={
              'form-group' + (submitted && !old_password ? ' has-error' : '')
            }
          >
            <label htmlFor="old_password">
              <input
                type="password"
                className="form-control"
                name="old_password"
                placeholder=" Old password"
                value={old_password}
                onChange={(e) => oldPasswordChange(e)}
              />
            </label>
            {submitted && !old_password && (
              <div className="error-message">Old password is required</div>
            )}
          </div>
          <div
            className={
              'form-group' + (submitted && !new_password ? ' has-error' : '')
            }
          >
            <label htmlFor="new_password">
              <input
                type="password"
                className="form-control"
                name="new_password"
                placeholder="New password"
                value={new_password}
                onChange={(e) => newPasswordChange(e)}
              />
            </label>
            {submitted && !new_password && (
              <div className="error-message">New password is required</div>
            )}
          </div>
          <div
            className={
              'form-group' +
              (submitted && !confirm_password ? ' has-error' : '')
            }
          >
            <label htmlFor="confirm_password">
              <input
                type="password"
                className="form-control"
                name="confirm_password"
                placeholder="Confirm new password"
                value={confirm_password}
                onChange={(e) => confirmPasswordChange(e)}
              />
            </label>
            {submitted && !confirm_password && (
              <div className="error-message">Retype new password</div>
            )}
          </div>
          <div className="form-group">
            <button className="btn-download" style={{ fontSize: '14px' }}>
              Change Password
            </button>
          </div>
          <div className="error-msg-container">
            {isError && <div className="auth-error-msg">{responseMsg}</div>}
            {isSuccess && <div className="auth-success-msg">{responseMsg}</div>}
          </div>
        </form>
      </div>
    </div>
  );
};

const mapStateToProps = state => ({
  responseMsg: state.get('responseMsg'),
  isError: state.get('isError'),
  isSuccess: state.get('isSuccess'),
});

export default connect(mapStateToProps)(ChangePasswordView);
