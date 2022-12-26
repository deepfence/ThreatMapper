/* eslint-disable react/destructuring-assignment */
import React from 'react';
import withIntegrationForm from '../../../hoc/notification-integration';

class HTTPEndpointForm extends React.PureComponent {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);

    this.state = {
      apiURL: '',
      authorizationKey: '',
      integration_type: 'http_endpoint',
    };
  }

  handleChange(e) {
    const { name, value } = e.target;
    this.setState({ [name]: value }, () => {
      const state = {
        ...this.state,
        api_url: this.state.apiURL,
        authorization_key: this.state.authorizationKey,
      };
      this.props.saveChildFormData(state);
    });
  }

  render() {
    const {apiURL, authorizationKey } = this.state;
    const { submitted } = this.props;

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
                  onChange={this.handleChange}
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
                  onChange={this.handleChange}
                  autoComplete="off"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
// TODO
// HTTPEndpoint is not supported for user activities, it is disabled for now
// when backend is enabled please remove thie code
const HTTPEndpointAdd = withIntegrationForm(HTTPEndpointForm, ['user_activity']);

export default HTTPEndpointAdd;
