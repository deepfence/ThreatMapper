/* eslint-disable consistent-return */
/* eslint-disable array-callback-return */
/* eslint-disable react/destructuring-assignment */
import React from 'react';
import {connect} from 'react-redux';
import {Field, reduxForm, formValueSelector} from 'redux-form/immutable';
import {Map} from 'immutable';
import DFSearchableSelectField from '../../common/multi-select/app-searchable-field';
import DFSelect from '../../common/multi-select/app';
import Loader from '../../loader';
import {enumerateFiltersAction, clearScheduledReportFormAction} from '../../../actions/app-actions';

const validate = (values) => {
  const errors = {};
  if (values && values.get('duration', '').length === 0) {
    errors.duration = 'Choose a duration';
  }
  if (values && values.get('resources', []).length === 0) {
    errors.resources = 'Select atleast one resource';
  }
  return errors;
};

const config = [
  {
    label: 'Vulnerabilities',
    value: 'cve',
  },
];
const nodeTypeOption = [
  {id: 1, display: 'host', type: 'host'},
  {id: 2, display: 'container', type: 'container'},
  {id: 3, display: 'container image', type: 'container_image'},
  {id: 4, display: 'pod', type: 'pod'}
];

const durationOption = [
  {
    id: 1, display: 'Last Day', number: '1', time_unit: 'day'
  },
  {
    id: 2, display: 'Last 7 days', number: '7', time_unit: 'day'
  },
  {
    id: 3, display: 'Last 1 month', number: '1', time_unit: 'month'
  },
  {
    id: 4, display: 'Last 6 months', number: '6', time_unit: 'month'
  },
  {
    id: 5, display: 'Download all', number: '0', time_unit: 'all'
  },
];

const renderField = ({
  input,
  type,
  label,
  meta: { touched, error, warning },
  disabled = false,
}) => (
  <div className="form-field">
    <span
      className="label"
    >
      {label}
    </span>
    <input
      {...input}
      type={type}
      disabled={disabled}
    />
    {(touched && warning && <div className="message warning-message">{warning}</div>)}
    {(touched && error && <div className="message error-message">{error}</div>)}
  </div>
);

class DownloadForm extends React.PureComponent {
  constructor(props) {
    super(props);
    this.submitClickHandler = this.submitClickHandler.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.renderForms = this.renderForms.bind(this);
    this.state = {
      resource: 'cve',
    };
  }

  componentWillUnmount() {
    const {
      clearScheduledReportFormAction: action,
    } = this.props;
    action();
  }

  componentDidUpdate() {
    const newSelectedResources = this.state.resource;
    const {
      selectedResources = [],
      enumerateFiltersAction: action,
    } = this.props;

    if (newSelectedResources !== selectedResources) {
      const params = {
        resource_type: this.state.resource,
      };
      action(params);
    }
  }

  submitClickHandler(values) {
    const {handleSubmit} = this.props;
    handleSubmit(values);
  }

  renderCve(filter) {
    const {
      something = '',
    } = this.props;
    return (
      <div className="nodes-filter-item" style={{marginLeft: '0px', width: '400px'}}>
        <Field
          something={something}
          key={filter.name}
          rootClassName="form-field dir-column"
          title={filter.name.replace(/_/g, ' ')}
          name={filter.name}
          component={DFSearchableSelectField}
          buttonLabel={`${filter.label}`}
          placeholder="Search"
          options={filter.options.map(option => ({
            label: option,
            value: option,
          }))}
          isMulti
        />
      </div>
    );
  }

  checkBoxes() {
    return (
      <div className="resource-option-wrapper">
        <div className="df-select df-select-content" style={{marginLeft: '0px', width: '200px', fontSize: '14px'}}>
          <DFSelect
            options={config.map(el => ({
              value: el.value,
              label: el.label,
            }))}
            onChange={this.handleChange}
            placeholder={config.map((el) => {
              if (el.value === this.state.resource) {
                return el.label;
              }
            })
              }
            value={this.state.resource}
            clearable={false}
          />
        </div>
      </div>
    );
  }

  handleChange(event) {
    this.setState({
      resource: event.value,
    });
  }

  renderForms(visibleFilters, resource) {
    const {setResource} = this.props;
    switch (resource) {
      case 'cve':
        setResource('cve');
        return ((visibleFilters.map(filter => this.renderCve(filter))));
      default:
        break;
    }
    return null;
  }

  render() {
    const {
      duration: selectedDuration,
      pristine,
      submitting,
      info,
      scheduleInterval,
      topologyFilters: allFilters,
    } = this.props;
    const durationOptions = durationOption.map(el => ({
      value: JSON.stringify({
        number: el.number,
        time_unit: el.time_unit,
      }),
      label: el.display,
    }));

    const resourceType = this.state.resource;
    const topologyFilters = allFilters.get(resourceType, []);
    const showEmailField = scheduleInterval;
    const downloadButtonLabel = scheduleInterval ? 'Schedule Report' : 'Generate PDF';
    const visibleFilters = topologyFilters;
    const options = nodeTypeOption.map(el => ({
      value: el.type,
      label: el.display,
    }));
    return (
      <div className="resource-download-form">
        <form
          className="df-modal-form"
          onSubmit={this.submitClickHandler}
        >
          <div>
            <div className="heading" style={{paddingLeft: '0px', width: '200px'}}> Select Resource</div>
            <br />
            <div className="form-field">
              <div className="df-checkbox-group">{this.checkBoxes()}</div>
            </div>
          </div>
          <div className="nodes-filter-item" style={{marginLeft: '0px', width: '400px', fontSize: '14px'}}>
            <Field
              name="duration"
              rootClassName="form-field dir-column"
              component={DFSearchableSelectField}
              options={durationOptions}
              value={options.filter(option => option.value === selectedDuration)}
              clearable={false}
              buttonLabel="Duration"
              isSearchable="false"
              />
          </div>
          {visibleFilters && this.renderForms(visibleFilters, resourceType)}
          {showEmailField
            && (
            <Field
              component={renderField}
              type="text"
              label="Email Address"
              name="email_address"
            />
            )
          }
          <br />
          <div className="form-field relative">
            <button
              className="primary-btn"
              type="submit"
              disabled={submitting || pristine}
            >
              {downloadButtonLabel}
            </button>
            {submitting && (
            <Loader
              style={{
                top: '25%', fontSize: '1.0rem', marginLeft: '1.0rem', marginTop: '-1.0rem'
              }}
              small />
            )}
          </div>
          {info && (
          <span className="message error-message">
            {' '}
            {info}
            {' '}
          </span>
          )}
        </form>
      </div>
    );
  }
}

const selector = formValueSelector('integrations-download-form');

const mapStateToProps = state => ({
  duration: selector(state, 'duration'),
  resource: selector(state, 'resource'),
  nodeType: selector(state, 'node_type'),
  selectedResources: selector(state, 'resources'),
  loading: state.getIn(['pdfReportForm', 'form', 'loading']),
  filterOptions: state.get('report_filter_options'),
  topologyFilters: state.getIn(['nodesView', 'topologyFilters']),
});

let initialValues = Map({});
initialValues = initialValues.set('node_type', {
  label: 'Node Type',
  value: 'host',
});

export default connect(mapStateToProps, {
  enumerateFiltersAction,
  clearScheduledReportFormAction,
})(reduxForm({
  form: 'integrations-download-form',
  initialValues,
  validate,
})(DownloadForm));
