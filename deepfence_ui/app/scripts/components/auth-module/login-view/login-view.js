/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

// Images imports
import brandLogo  from '../../../../images/deepfence-logo.png';

// Action imports
import {
  authenticateUser, resetAuthModuleStates
} from '../../../actions/app-actions';

class LoginView extends React.Component {
  constructor() {
    super();
    this.state = {
      username: '',
      password: '',
      errorMsg: '',
      submitted: false,
      submitting: false
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    if (newProps.errorMsg) {
      this.setState({errorMsg: newProps.errorMsg});
    }
    this.setState({submitting: newProps.submitting});
  }

  componentWillUnmount(){
    this.props.dispatch(resetAuthModuleStates());
  }

  handleChange(e) {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  }

  handleSubmit(e) {
    e.preventDefault();
    this.setState({
      submitted: true,
      submitting: true
    });
    const { username, password } = this.state;
    if (username && password) {
      let params = {
        email: username,
        password: password
      }
      this.props.dispatch(authenticateUser(params));
    }
  }

  render() {
    const { username, password, submitted, submitting } = this.state;
    
    return (
      <div className="login-view-wrapper">
        <div className="brand-logo-wrapper">
          <img src={ brandLogo } alt="DeepFence Logo" />
        </div>
        <div className="login-form-wrapper">
          <div className="form-heading">Sign in with your credentials</div>
          <form name="form" onSubmit={this.handleSubmit} method="post">
            <div className={'form-group' + (submitted && !username ? ' has-error' : '')}>
              <label htmlFor="username">
                <i className="fa fa-envelope-o" aria-hidden="true"></i>
                <input type="email" className="form-control" name="username" placeholder="Email" value={username} onChange={this.handleChange} />
              </label>
              {submitted && !username && <div className="field-error">Username is required</div>}
            </div>
            <div className={'form-group' + (submitted && !password ? ' has-error' : '')}>
              <label htmlFor="password">
                <i className="fa fa-key" aria-hidden="true"></i>
                <input type="password" className="form-control" name="password" placeholder="Password" value={password} onChange={this.handleChange} />
              </label>
              {submitted && !password && <div className="field-error">Password is required</div>}
            </div>
            <div className="error-msg-container">
              {this.state.errorMsg && <div className="auth-error-msg">{this.state.errorMsg}</div>}
            </div>
            <div className="other-links-wrapper">
              <Link className="other-link" to='/forgot-password'>Forgot Password?</Link>
              <Link className="other-link" to='/register'>Register</Link>
            </div>
            <div className="form-group">
              <button className="app-btn" disabled={submitting} style={{borderRadius: '4px'}}>Login</button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    errorMsg: state.get('errorMsg'),
    submitting: state.get('submitting')
  };
}

export default connect(
  mapStateToProps,
  null,
  null,
  {pure: false}
)(LoginView);
