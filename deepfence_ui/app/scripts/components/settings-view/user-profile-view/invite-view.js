/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';
import { sendSignUpInvite } from '../../../actions/app-actions';

const availableRoles = [{ id: 1, role: 'admin', label: 'admin' }, { id: 2, role: 'user', label: 'user' }, { id: 3, role: 'read_only_user', label: 'read only user' }];

class InviteView extends React.Component {
  constructor() {
    super();
    this.state = {
      email: '',
      selectedRole: availableRoles[0].role,
      submitted: false
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleDropDownChange = this.handleDropDownChange.bind(this);
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    if (newProps.isSuccess && !newProps.isError) {
      this.setState({
        responseMsg: newProps.responseMsg,
        isSuccess: newProps.isSuccess,
        isError: newProps.isError
      });
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
    const { email, selectedRole } = this.state;
    if (email, selectedRole) {
      let params = {
        email: email,
        role: selectedRole,
        action: e?.nativeEvent?.submitter?.value ?? 'send_invite_email'
      }
      this.props.dispatch(sendSignUpInvite(params));
    }
  }

  handleDropDownChange(e) {
    this.setState({
      selectedRole: e.target.value
    });
  }

  render() {
    const { email, selectedRole, submitted } = this.state;

    return (
      <div className="sign-up-invite-view-wrapper">
        <div className="sign-up-invite-form-wrapper">
          <div className="form-heading">Invite User</div>
          <form name="form" onSubmit={this.handleSubmit}>
            <div className={'form-group' + (submitted && !email ? ' has-error' : '')}>
              <label htmlFor="email">
                <i className="fa fa-envelope-o" aria-hidden="true"></i>
                <input type="email" className="form-control" name="email" placeholder="Email" value={email} onChange={this.handleChange} />
              </label>
              {submitted && !email && <div className="field-error">Email is required</div>}
            </div>
            <div className={'form-group' + (submitted && !selectedRole ? ' has-error' : '')}>
              <select value={selectedRole} onChange={this.handleDropDownChange} className="form-select">
                {availableRoles.map(option => {
                  return (<option key={option.id} value={option.role}>{option.label}</option>);
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
)(InviteView);
