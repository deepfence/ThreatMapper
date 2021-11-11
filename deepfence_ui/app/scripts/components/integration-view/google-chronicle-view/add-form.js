/* eslint-disable react/destructuring-assignment */
import React, {useState} from 'react';
import withIntegrationForm from '../../../hoc/notification-integration';

const GoogleChronicleForm = (props) => {
  const [apiURL, setApiURL] = useState('');
  const [authorizationKey, setAuthorizationKey] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    switch (name) {
      case 'apiURL':
        setApiURL(value);
        break;
      case 'authorizationKey':
        setAuthorizationKey(value);
        break;
      default:
        break;
    }

    props.saveChildFormData({
      api_url: apiURL,
      authorization_key: authorizationKey,
      integration_type: "google_chronicle",
      apiURL,
      authorizationKey,
    });
  }

  const { submitted } = props;
  return (
    <div>
      <div className="row">
        <div className="col-md-4">
          <div className={`form-group ${(submitted && !apiURL ? 'has-error' : '')}`}>
            <label htmlFor="apiURL">
              <i className="fa fa-link" aria-hidden="true" />
              <input
                type="text"
                className="form-control"
                name="apiURL"
                placeholder="API URL"
                value={apiURL}
                onChange={handleChange}
                autoComplete="off"
              />
            </label>
            { submitted && !apiURL && <div className="field-error">API URL is required</div> }
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
                onChange={handleChange}
                autoComplete="off"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

const googleChronicleAdd = withIntegrationForm(GoogleChronicleForm);

export default googleChronicleAdd;
