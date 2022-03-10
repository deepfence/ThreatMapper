import React, { useState } from 'react';
import withIntegrationForm from '../../../hoc/notification-integration';

const SumoLogicForm = props => {
  const [state, setState] = useState({
    apiURL: '',
    integration_type: 'sumo_logic',
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setState(prevState => ({
      ...prevState,
      [name]: value,
    }));
    props.saveChildFormData(state);
  };

  const { apiURL } = state;
  const { submitted } = props;

  return (
    <div>
      <div className={`form-group ${submitted && !apiURL ? 'has-error' : ''}`}>
        <label htmlFor="apiURL">
          <i className="fa fa-link" aria-hidden="true" />
          <input
            type="text"
            className="form-control"
            name="apiURL"
            placeholder="Sumo Logic's HTTP Endpoint"
            value={apiURL}
            onChange={e => handleChange(e)}
            autoComplete="off"
          />
          <span className="help-text">
            {' '}
            Ex.
            https://[SumoEndpoint]/receiver/v1/http/[UniqueHTTPCollectorCode]{' '}
          </span>
        </label>
        {submitted && !apiURL && (
          <div className="field-error">API URL is required</div>
        )}
      </div>
    </div>
  );
};

const SumoLogicAdd = withIntegrationForm(SumoLogicForm);

export default SumoLogicAdd;
