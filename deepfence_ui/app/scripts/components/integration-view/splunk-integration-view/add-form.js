/* eslint-disable react/destructuring-assignment */
import React from 'react';
import withIntegrationForm from '../../../hoc/notification-integration';

class SplunkIntegrationForm extends React.PureComponent {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);

    this.state = {
      api_url: '',
      token: '',
      integration_type: 'splunk',
      api_type: 'event_collector',
    };
  }

  handleChange(e) {
    const { name, value } = e.target;
    this.setState({ [name]: value }, () => {
      this.props.saveChildFormData(this.state);
    });
  }

  render() {
    const { token } = this.state;
    const { submitted } = this.props;

    return (
      <div>
        <div className="row">
          <div className="col-md-4">
            <div className={`form-group ${(submitted && !this.state.api_url ? 'has-error' : '')}`}>
              <label htmlFor="apiURL">
                <i className="fa fa-link" aria-hidden="true" />
                <input type="text" className="form-control" name="api_url" placeholder="Splunk Endpoint Url" value={this.state.api_url} onChange={this.handleChange} />
                <span className="help-text"> Ex. https://[splunkEndpoint]:8089/services/receivers/simple </span>
                <div className="help-text"> Version: 7.1 </div>
              </label>
              { submitted && !this.state.api_url && <div className="field-error">Splunk Endpoint url is required</div> }
            </div>
          </div>
          <div className="col-md-4">
            <div className={`form-group ${(submitted && !token ? 'has-error' : '')}`}>
              <label htmlFor="token">
                <i className="fa fa-user" aria-hidden="true" />
                <input type="text" className="form-control" name="token" placeholder="Receiver Token" value={token} onChange={this.handleChange} />
              </label>
              { submitted && !token && <div className="field-error">Receiver Token is required</div> }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const SplunkIntegrationAdd = withIntegrationForm(SplunkIntegrationForm);

export default SplunkIntegrationAdd;
