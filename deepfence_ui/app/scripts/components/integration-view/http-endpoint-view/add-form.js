/* eslint-disable react/destructuring-assignment */
import React, { useState } from 'react';
import withIntegrationForm from '../../../hoc/notification-integration';

const HTTPEndpointForm = props => {
  const [state, setState] = useState({
    apiURL: '',
    authorizationKey: '',
    integration_type: 'http_endpoint',
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setState(prevState => ({
      ...prevState,
      [name]: value,
    }));
    props.saveChildFormData(state);
  };

  const { apiURL, authorizationKey } = state;
  const { submitted } = props;

  return (
    <div>
      <div className="row">
        <div className="col-md-4">
          <div
            className={`form-group ${submitted && !apiURL ? 'has-error' : ''}`}
          >
            <label htmlFor="apiURL">
              <i className="fa fa-link" aria-hidden="true" />
              <input
                type="text"
                className="form-control"
                name="apiURL"
                placeholder="API URL"
                value={apiURL}
                onChange={e => handleChange(e)}
                autoComplete="off"
              />
            </label>
            {submitted && !apiURL && (
              <div className="field-error">API URL is required</div>
            )}
          </div>
        </div>
        <div className="col-md-4">
          <div className="form-group">
            <label htmlFor="authorizationKey">
              <i className="fa fa-key" aria-hidden="true" />
              <input
                type="text"
                className="form-control"
                name="authorizationKey"
                placeholder="Authorization Key (Optional)"
                value={authorizationKey}
                onChange={e => handleChange(e)}
                autoComplete="off"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

const HTTPEndpointAdd = withIntegrationForm(HTTPEndpointForm);

export default HTTPEndpointAdd;
