import React, { useState } from 'react';
import withIntegrationForm from '../../../hoc/notification-integration';

const JiraIntegrationForm = props => {
  const [state, setState] = useState({
    jiraSiteUrl: '',
    username: '',
    password: '',
    jiraProjectKey: '',
    issueType: '',
    integration_type: 'jira',
    isAuthToken: true,
    api_token: '',
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setState(prevState => ({
      ...prevState,
      [name]: value,
    }));
    props.saveChildFormData(state);
  };

  const handleRadioChange = e => {
    const { name, value } = e.target;

    if (name === 'authType' && value === 'apitoken') {
      setState({ isAuthToken: true, password: '', api_token: '' });
    } else if (name === 'authType' && value === 'password') {
      setState({ isAuthToken: false, password: '', api_token: '' });
    }
  };

  const {
    jiraSiteUrl,
    username,
    password,
    jiraProjectKey,
    issueType,
    api_token,
    isAuthToken,
  } = state;

  const { submitted } = props;
  const radioButtons = [
    {
      label: 'API Token',
      value: 'apitoken',
      checked: isAuthToken,
    },
    {
      label: 'Password',
      value: 'password',
      checked: !isAuthToken,
    },
  ];

  return (
    <div>
      <div className="row">
        <div className="col-md-4">
          <div
            className={`form-group ${
              submitted && !jiraSiteUrl ? 'has-error' : ''
            }`}
          >
            <label htmlFor="jiraSiteUrl">
              <i className="fa fa-link" aria-hidden="true" />
              <input
                type="text"
                className="form-control"
                name="jiraSiteUrl"
                placeholder="Jira Site URL"
                value={jiraSiteUrl}
                onChange={e => handleChange(e)}
                autoComplete="off"
              />
            </label>
            <span className="help-text">
              Ex. https://[organization].atlassian.net/
            </span>
            <div className="help-text">Version: 7.13</div>
            {submitted && !jiraSiteUrl && (
              <div className="field-error">Jira Site URL is required</div>
            )}
          </div>
        </div>
        <div className="col-md-4">
          <div
            className={`form-group ${
              submitted && !username ? 'has-error' : ''
            }`}
          >
            <label htmlFor="username">
              <i className="fa fa-user" aria-hidden="true" />
              <input
                type="text"
                className="form-control"
                name="username"
                placeholder="Username"
                value={username}
                onChange={e => handleChange(e)}
                autoComplete="off"
              />
            </label>
            {submitted && !username && (
              <div className="field-error">
                Please Enter a Valid Email Address
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-4">
          <div className="form-group row">
            {radioButtons.map(option => (
              <div key={option.value}>
                <label
                  htmlFor={option.value}
                  className="col-sm-12 col-form-label radio-label"
                >
                  <input
                    type="radio"
                    value={option.value}
                    name="authType"
                    id={option.value}
                    checked={option.checked}
                    onChange={e => handleRadioChange(e)}
                    className="col-form-check-input mr-1"
                  />
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-4">
          {!isAuthToken && (
            <div
              className={`form-group ${
                submitted && !password ? 'has-error' : ''
              }`}
            >
              <label htmlFor="password">
                <i className="fa fa-lock" aria-hidden="true" />
                <input
                  type="password"
                  className="form-control"
                  name="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => handleChange(e)}
                  autoComplete="off"
                />
              </label>
              {submitted && !password && (
                <div className="field-error">Password is required</div>
              )}
            </div>
          )}
          {isAuthToken && (
            <div
              className={`form-group ${
                submitted && !api_token ? 'has-error' : ''
              }`}
            >
              <label htmlFor="api_token">
                <i className="fa fa-key" aria-hidden="true" />
                <input
                  type="password"
                  className="form-control"
                  name="api_token"
                  placeholder="API Token"
                  value={api_token}
                  onChange={e => handleChange(e)}
                  autoComplete="off"
                />
              </label>
              {submitted && !api_token && (
                <div className="field-error">API Token is required</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-4">
          <div
            className={`form-group ${
              submitted && !jiraProjectKey ? 'has-error' : ''
            }`}
          >
            <label htmlFor="jiraProjectKey">
              <i className="fa fa-folder" aria-hidden="true" />
              <input
                type="text"
                className="form-control"
                name="jiraProjectKey"
                placeholder="Jira Project Key"
                value={jiraProjectKey}
                onChange={e => handleChange(e)}
                autoComplete="off"
              />
            </label>
            {submitted && !jiraProjectKey && (
              <div className="field-error">Jira Project Key is required</div>
            )}
          </div>
        </div>
        <div className="col-md-4">
          <div
            className={`form-group ${
              submitted && !issueType ? 'has-error' : ''
            }`}
          >
            <label htmlFor="issueType">
              <i className="fa fa-globe" aria-hidden="true" />
              <input
                type="text"
                className="form-control"
                name="issueType"
                placeholder="Bug, Task, etc.."
                value={issueType}
                onChange={e => handleChange(e)}
                autoComplete="off"
              />
              <span className="help-text">Case sensitive</span>
            </label>
            {submitted && !issueType && (
              <div className="field-error">Issue Type is required</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const JiraIntegrationAdd = withIntegrationForm(JiraIntegrationForm);

export default JiraIntegrationAdd;
