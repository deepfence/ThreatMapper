/* eslint-disable react/destructuring-assignment */
import React from 'react';
import withIntegrationForm from '../../../hoc/notification-integration';

class SumoLogicForm extends React.PureComponent {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);

    this.state = {
      apiURL: '',
      integration_type: 'sumo_logic',
    };
  }

  handleChange(e) {
    const { name, value } = e.target;
    this.setState({ [name]: value }, () => {
      const state = {
        ...this.state,
        api_url: this.state.apiURL,
      };
      this.props.saveChildFormData(state);
    });
  }

  render() {
    const { apiURL } = this.state;
    const { submitted } = this.props;

    return (
      <div>
        <div className={`form-group ${(submitted && !apiURL ? 'has-error' : '')}`}>
          <label htmlFor="apiURL">
            <i className="fa fa-link" aria-hidden="true" />
            <input
              type="text"
              className="form-control"
              name="apiURL"
              placeholder="Sumo Logic's HTTP Endpoint"
              value={apiURL}
              onChange={this.handleChange}
              autoComplete="off"
            />
            <span className="help-text"> Ex. https://[SumoEndpoint]/receiver/v1/http/[UniqueHTTPCollectorCode] </span>
          </label>
          { submitted && !apiURL && <div className="field-error">API URL is required</div> }
        </div>
      </div>
    );
  }
}

const SumoLogicAdd = withIntegrationForm(SumoLogicForm);

export default SumoLogicAdd;
