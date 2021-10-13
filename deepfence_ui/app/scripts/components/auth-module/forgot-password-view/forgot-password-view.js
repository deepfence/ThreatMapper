/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

// Images imports
import  brandLogo  from '../../../../images/deepfence-logo.png';

// Action imports
import {
  requestPasswordResetLink
} from '../../../actions/app-actions';

class ForgotPasswordView extends React.Component {
  constructor() {
    super();
    this.state = {
      email: '',
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
    const { email } = this.state;
    if (email) {
      let params = {
        email: email
      }
      this.props.dispatch(requestPasswordResetLink(params));
    }
  }

  render() {
    const { email, submitted } = this.state;

    return (
      <div className="forgot-password-view-wrapper">
        <div className="brand-logo-wrapper">
          <img src={ brandLogo } alt="DeepFence Logo" />
        </div>
        <div className="forgot-password-form-wrapper">
          <div className="form-heading">Please provide registered emailId</div>
          <form name="form" onSubmit={this.handleSubmit}>
            <div className={'form-group' + (submitted && !email ? ' has-error' : '')}>
              <label htmlFor="email">
                <i className="fa fa-envelope-o" aria-hidden="true"></i>
                <input type="email" className="form-control" name="email" placeholder="Email" value={email} onChange={this.handleChange} />
              </label>
              {submitted && !email && <div className="field-error">Email is required</div>}
            </div>
            <div className="error-msg-container">
              {this.state.isError && <div className="auth-error-msg">{this.state.responseMsg}</div>}
              {this.state.isSuccess && <div className="auth-success-msg">{this.state.responseMsg}</div>}
            </div>
            <div className="form-group">
              <button className="app-btn">Send Link</button>
            </div>
            <div className="navigation-link-wrapper">
              <Link className="navigation-link" to="/login">Back to Login</Link>
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
)(ForgotPasswordView);