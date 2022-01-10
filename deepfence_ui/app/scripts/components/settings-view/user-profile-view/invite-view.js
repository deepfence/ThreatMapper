/*eslint-disable*/

// React imports
import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { sendSignUpInvite } from '../../../actions/app-actions';

const availableRoles = [
  { id: 1, role: 'admin', label: 'admin' },
  { id: 2, role: 'user', label: 'user' },
  { id: 3, role: 'read_only_user', label: 'read only user' },
];

const InviteView = props => {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState(availableRoles[0].role);
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

  const handleChange = e => {
    const { value } = e.target;
    setEmail(value);
  };

  const handleSubmit = e => {
    e.preventDefault();
    setSubmitted(true);
    if ((email, selectedRole) && email.length > 0) {
      let params = {
        email: email,
        role: selectedRole,
        action: e?.nativeEvent?.submitter?.value ?? 'send_invite_email',
      };
      props.dispatch(sendSignUpInvite(params));
    }
  };

  const handleDropDownChange = e => {
    setSelectedRole(e.target.value);
  };

  return (
    <div className="sign-up-invite-view-wrapper">
      <div className="sign-up-invite-form-wrapper">
        <div className="form-heading">Invite User</div>
        <form name="form" onSubmit={e => handleSubmit(e)}>
          <div
            className={'form-group' + (submitted && !email ? ' has-error' : '')}
          >
            <label htmlFor="email">
              <i className="fa fa-envelope-o" aria-hidden="true"></i>
              <input
                type="email"
                className="form-control"
                name="email"
                placeholder="Email"
                value={email}
                onChange={(e) => handleChange(e)}
              />
            </label>
            {submitted && !email && (
              <div className="field-error">Email is required</div>
            )}
          </div>
          <div
            className={
              'form-group' + (submitted && !selectedRole ? ' has-error' : '')
            }
          >
            <select
              value={selectedRole}
              onChange={e => handleDropDownChange(e)}
              className="form-select"
            >
              {availableRoles.map(option => {
                return (
                  <option key={option.id} value={option.role}>
                    {option.label}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: '0px' }}>
            <button className="app-btn" value="send_invite_email">
              Send sign up request
            </button>
          </div>
          <div style={{ textAlign: 'center' }}>OR</div>
          <div className="form-group">
            <button className="app-btn" value="get_invite_link">
              Get an invite link
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

function mapStateToProps(state) {
  return {
    responseMsg: state.get('responseMsg'),
    isError: state.get('isError'),
    isSuccess: state.get('isSuccess'),
  };
}

export default connect(mapStateToProps)(InviteView);
