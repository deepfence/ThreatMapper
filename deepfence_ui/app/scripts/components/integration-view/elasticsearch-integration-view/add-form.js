/* eslint-disable react/destructuring-assignment */
import React from 'react';
import withIntegrationForm from '../../../hoc/notification-integration';

class ElasticsearchIntegrationForm extends React.PureComponent {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);

    this.state = {
      esURL: '',
      index: '',
      docType: '',
      integration_type: 'elasticsearch',
    };
  }

  handleChange(e) {
    const { name, value } = e.target;
    this.setState({ [name]: value }, () => {
      const state = {
        ...this.state,
        es_url: this.state.esURL,
        doc_type: this.state.docType,
      };

      // Because of lack of isValidated flag and actual form
      // submission is being done by HOC, the HOC doesn't have
      // a way to know if all the required fields are filled
      // before firing the API.
      // The current logic to validate uses all non-zero values.
      // So we need to send only mandatory fields to the child payload.
      // AuthHeader is optional and we send it only if the user has filled it.
      const {
        authHeader,
      } = this.state;
      if (authHeader) {
        state.auth_header = authHeader;
      }
      this.props.saveChildFormData(state);
    });
  }

  render() {
    const {
      esURL, index, docType, authHeader
    } = this.state;
    const { submitted } = this.props;

    return (
      <div>
        <div className="row">
          <div className="col-md-4">
            <div className={`form-group ${(submitted && !esURL ? 'has-error' : '')}`}>
              <label htmlFor="apiURL">
                <i className="fa fa-link" aria-hidden="true" />
                <input type="text" className="form-control" name="esURL" placeholder="Elasticsearch Endpoint Url" value={esURL} onChange={this.handleChange} />
              </label>
              <div className="help-text">
                Version: 5.x and above
              </div>
              { submitted && !esURL && <div className="field-error">Elasticsearch Endpoint url is required</div> }
            </div>
          </div>
          <div className="col-md-4">
            <div className={`form-group ${(submitted && !index ? 'has-error' : '')}`}>
              <label htmlFor="index">
                <i className="fa fa-industry" aria-hidden="true" />
                <input type="text" className="form-control" name="index" placeholder="Elasticsearch Index" value={index} onChange={this.handleChange} />
              </label>
              { submitted && !index && <div className="field-error">Elasticsearch Index is required</div> }
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-4">
            <div className={`form-group ${(submitted && !docType ? 'has-error' : '')}`}>
              <label htmlFor="docType">
                <i className="fa fa-file" aria-hidden="true" />
                <input
                  type="text"
                  className="form-control"
                  name="docType"
                  placeholder="Elasticsearch doc type"
                  value={docType}
                  onChange={this.handleChange}
                  autoComplete="off"
                />
              </label>
              { submitted && !docType && <div className="field-error">Elasticsearch doc type is required</div> }
            </div>
          </div>
          <div className="col-md-4">
            <div className="form-group">
              <label htmlFor="authHeader">
                <i className="fa fa-key" aria-hidden="true" />
                <input
                  type="text"
                  className="form-control"
                  name="authHeader"
                  placeholder="Elasticsearch Auth Header value"
                  value={authHeader}
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

const ElasticsearchIntegrationAdd = withIntegrationForm(ElasticsearchIntegrationForm);

export default ElasticsearchIntegrationAdd;
