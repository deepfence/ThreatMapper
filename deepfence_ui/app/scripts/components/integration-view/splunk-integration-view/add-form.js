import React, { useState } from 'react';
import withIntegrationForm from '../../../hoc/notification-integration';

const SplunkIntegrationForm = props => {
  const [state, setState] = useState({
    api_url: '',
    token: '',
    integration_type: 'splunk',
    api_type: 'event_collector',
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setState(prevState => ({
      ...prevState,
      [name]: value,
    }));
    props.saveChildFormData(state);
  };

  const { token, api_url } = state;
  const { submitted } = props;

  return (
    <div>
      <div className="row">
        <div className="col-md-4">
          <div
            className={`form-group ${submitted && !api_url ? 'has-error' : ''}`}
          >
            <label htmlFor="apiURL">
              <i className="fa fa-link" aria-hidden="true" />
              <input
                type="text"
                className="form-control"
                name="api_url"
                placeholder="Splunk Endpoint Url"
                value={api_url}
                onChange={e => handleChange(e)}
              />
              <span className="help-text">
                {' '}
                Ex. https://[splunkEndpoint]:8089/services/receivers/simple{' '}
              </span>
              <div className="help-text"> Version: 7.1 </div>
            </label>
            {submitted && !api_url && (
              <div className="field-error">Splunk Endpoint url is required</div>
            )}
          </div>
        </div>
        <div className="col-md-4">
          <div
            className={`form-group ${submitted && !token ? 'has-error' : ''}`}
          >
            <label htmlFor="token">
              <i className="fa fa-user" aria-hidden="true" />
              <input
                type="text"
                className="form-control"
                name="token"
                placeholder="Receiver Token"
                value={token}
                onChange={e => handleChange(e)}
              />
            </label>
            {submitted && !token && (
              <div className="field-error">Receiver Token is required</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SplunkIntegrationAdd = withIntegrationForm(SplunkIntegrationForm);

export default SplunkIntegrationAdd;
