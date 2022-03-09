/* eslint-disable react/destructuring-assignment */
import React, { useState } from 'react';
import withIntegrationForm from '../../../hoc/notification-integration';

const ElasticsearchIntegrationForm = props => {
  const [state, setState] = useState({
    esURL: '',
    index: '',
    docType: '',
    integration_type: 'elasticsearch',
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setState(prevState => ({
      ...prevState,
      [name]: value,
    }));
    props.saveChildFormData(state);
  };

  const { esURL, index, docType, authHeader } = state;
  const submitted = props;

  return (
    <div>
      <div className="row">
        <div className="col-md-4">
          <div
            className={`form-group ${submitted && !esURL ? 'has-error' : ''}`}
          >
            <label htmlFor="apiURL">
              <i className="fa fa-link" aria-hidden="true" />
              <input
                type="text"
                className="form-control"
                name="esURL"
                placeholder="Elasticsearch Endpoint Url"
                value={esURL}
                onChange={e => handleChange(e)}
              />
            </label>
            <div className="help-text">Version: 5.x and above</div>
            {submitted && !esURL && (
              <div className="field-error">
                Elasticsearch Endpoint url is required
              </div>
            )}
          </div>
        </div>
        <div className="col-md-4">
          <div
            className={`form-group ${submitted && !index ? 'has-error' : ''}`}
          >
            <label htmlFor="index">
              <i className="fa fa-industry" aria-hidden="true" />
              <input
                type="text"
                className="form-control"
                name="index"
                placeholder="Elasticsearch Index"
                value={index}
                onChange={e => handleChange(e)}
              />
            </label>
            {submitted && !index && (
              <div className="field-error">Elasticsearch Index is required</div>
            )}
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-4">
          <div
            className={`form-group ${submitted && !docType ? 'has-error' : ''}`}
          >
            <label htmlFor="docType">
              <i className="fa fa-file" aria-hidden="true" />
              <input
                type="text"
                className="form-control"
                name="docType"
                placeholder="Elasticsearch doc type"
                value={docType}
                onChange={e => handleChange(e)}
                autoComplete="off"
              />
            </label>
            {submitted && !docType && (
              <div className="field-error">
                Elasticsearch doc type is required
              </div>
            )}
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

const ElasticsearchIntegrationAdd = withIntegrationForm(
  ElasticsearchIntegrationForm
);

export default ElasticsearchIntegrationAdd;
