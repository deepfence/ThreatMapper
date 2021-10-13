/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';

import { logoutUser, requestPasswordChange } from '../../../actions/app-actions';

class ChangePasswordView extends React.Component {
  constructor() {
    super();
    this.state = {
      old_password: '',
      new_password: '',
      confirm_password: '',
      submitted: false
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    if (newProps.isSuccess && !newProps.isError) {
      this.setState({
        responseMsg: newProps.responseMsg,
        isSuccess: newProps.isSuccess,
        isError: newProps.isError
      });
      setTimeout(()=> {
        this.props.dispatch(logoutUser());
      }, 2000)
    } else if (!newProps.isSuccess && newProps.isError) {
      this.setState({
        responseMsg: newProps.responseMsg,
        isSuccess: newProps.isSuccess,
        isError: newProps.isError
      });
    }
  }

  handleChange(e) {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  }

  handleSubmit(e) {
    e.preventDefault();
    this.setState({ submitted: true });
    const { old_password, new_password, confirm_password } = this.state;
    if (old_password && new_password && confirm_password) {
      let params = {
        old_password: old_password,
        password: new_password,
        confirm_password: confirm_password
      }
      this.props.dispatch(requestPasswordChange(params));
    }
  }

  render() {
    const { old_password, new_password, confirm_password, submitted } = this.state;

    return (
      <div className="change-password-view-wrapper">
        <div className="change-password-form-wrapper">
          <div className="form-heading" style={{marginBottom: '20px'}}>Change your password</div>
          <form name="form" onSubmit={this.handleSubmit}>
            <div className={'form-group' + (submitted && !old_password ? ' has-error' : '')}>
              <label htmlFor="old_password">
                <input type="password" className="form-control" name="old_password" placeholder=" Old password" value={old_password} onChange={this.handleChange} />
              </label>
              {submitted && !old_password && <div className="field-error">Old password is required</div>}
            </div>
            <div className={'form-group' + (submitted && !new_password ? ' has-error' : '')}>
              <label htmlFor="new_password">
                <input type="password" className="form-control" name="new_password" placeholder="New password" value={new_password} onChange={this.handleChange} />
              </label>
              {submitted && !new_password && <div className="field-error">New password is required</div>}
            </div>
            <div className={'form-group' + (submitted && !confirm_password ? ' has-error' : '')}>
              <label htmlFor="confirm_password">
                <input type="password" className="form-control" name="confirm_password" placeholder="Confirm new password" value={confirm_password} onChange={this.handleChange} />
              </label>
              {submitted && !confirm_password && <div className="field-error">Retype new password</div>}
            </div>
            <div className="form-group">
              <button className="btn-download" style={{fontSize: '14px'}}>Change Password</button>
            </div>
            <div className="error-msg-container">
              {this.state.isError && <div className="auth-error-msg">{this.state.responseMsg}</div>}
              {this.state.isSuccess && <div className="auth-success-msg">{this.state.responseMsg}</div>}
            </div>
          </form>
        </div>

      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    responseMsg: state.get('responseMsg'),
    isError: state.get('isError'),
    isSuccess: state.get('isSuccess')
  };
}

export default connect(
  mapStateToProps
)(ChangePasswordView);