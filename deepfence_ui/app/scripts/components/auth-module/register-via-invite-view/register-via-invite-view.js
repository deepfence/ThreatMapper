/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

// Images imports
import  brandLogo  from '../../../../images/deepfence-logo.png';

// Action imports
import { registerUserViaInvite } from '../../../actions/app-actions';

class RegisterViaInviteView extends React.Component {
  constructor() {
    super();
    this.state = {
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
      submitted: false,
      isError: false
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    if (newProps.isError) {
      this.setState({
        responseMsg: newProps.responseMsg,
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

    const url = window.location.href;
    const inviteCode = url.substring(url.indexOf("=") + 1, url.length);

    this.setState({ submitted: true });
    const { firstName, lastName, password, confirmPassword, phoneNumber } = this.state;
    if (firstName && lastName && password && confirmPassword) {
      let params = {
        first_name: firstName,
        last_name: lastName,
        password: password,
        confirm_password: confirmPassword,
        phone_number: (phoneNumber.length > 0) ? phoneNumber : undefined,
        code: inviteCode
      }
      this.props.dispatch(registerUserViaInvite(params));
    }
  }

  render() {
    const { firstName, lastName, password, confirmPassword, phoneNumber, submitted } = this.state;
    return (
      <div className="register-view-wrapper">
        <div className="brand-logo-wrapper">
          <img src={ brandLogo } alt="DeepFence Logo" />
        </div>
        <div className="register-form-wrapper">
          <div className="form-heading">Create new account</div>
          <form name="form" onSubmit={this.handleSubmit}>
            <div className={'form-group' + (submitted && !firstName ? ' has-error' : '')}>
              <label htmlFor="firstName">
                <i className="fa fa-user-o" aria-hidden="true"></i>
                <input type="text" className="form-control" name="firstName" placeholder="First Name" value={firstName} onChange={this.handleChange} />
              </label>
              {submitted && !firstName && <div className="field-error">First name is required</div>}
            </div>
            <div className={'form-group' + (submitted && !lastName ? ' has-error' : '')}>
              <label htmlFor="lastName">
                <i className="fa fa-user-o" aria-hidden="true"></i>
                <input type="text" className="form-control" name="lastName" placeholder="Last Name" value={lastName} onChange={this.handleChange} />
              </label>
              {submitted && !lastName && <div className="field-error">Last name is required</div>}
            </div>
            <div className={'form-group' + (submitted && !password ? ' has-error' : '')}>
              <label htmlFor="password">
                <i className="fa fa-key" aria-hidden="true"></i>
                <input type="password" className="form-control" name="password" placeholder="Password" value={password} onChange={this.handleChange} />
              </label>
              {submitted && !password && <div className="field-error">Password is required</div>}
            </div>
            <div className={'form-group' + (submitted && !confirmPassword ? ' has-error' : '')}>
              <label htmlFor="confirmPassword">
                <i className="fa fa-key" aria-hidden="true"></i>
                <input type="password" className="form-control" name="confirmPassword" placeholder="Confirm Password" value={confirmPassword} onChange={this.handleChange} />
              </label>
              {submitted && !confirmPassword && <div className="field-error">Retype above password</div>}
            </div>
            <div className='form-group'>
              <label htmlFor="phoneNumber">
                <i className="fa fa-phone" aria-hidden="true"></i>
                <input type="number" className="form-control" name="phoneNumber" placeholder="Phone Number (Optional)" value={phoneNumber} onChange={this.handleChange} />
              </label>
            </div>
            <div className="error-msg-container">
              {this.state.isError && <div className="auth-error-msg">{this.state.responseMsg}</div>}
            </div>
            <div className="form-group">
              <button className="app-btn">Register</button>
            </div>
            <div className="user-agreement-link-wrapper">
              By signing up you agree to our <Link to="/user-agreement" target='_blank'>License Agreement</Link>
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
    isError: state.get('isError')
  };
}

export default connect(
  mapStateToProps
)(RegisterViaInviteView);