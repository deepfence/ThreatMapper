/* eslint-disable */
import React from 'react';
import {connect} from 'react-redux';
import {Field, reduxForm, formValueSelector} from 'redux-form/immutable';
import {Map} from 'immutable';
import DFSearchableSelectField from '../../common/multi-select/app-searchable-field';
import ToggleSwitchField from '../../common/toggle-switch/redux-form-field';
import Loader from '../../loader';
import {
  enumerateFiltersAction,
  clearScheduledReportFormAction,
} from '../../../actions/app-actions';

const validate = (values) => {
  const errors = {};
  if (values && values.get('node_type', '').length === 0) {
    errors.node_type = 'Select one node type';
  }
  if (values && values.get('duration', '').length === 0) {
    errors.duration = 'Choose a duration';
  }
  if (values && values.get('resources', []).length === 0) {
    errors.resources = 'Select atleast one resource';
  }
  if (values && values.get('schedule_interval', '').length !== 0) {
    if (parseInt(values.get('schedule_interval'), 10) < 1) {
      errors.schedule_interval = 'Schedule interval must be > 0';
    }
    if (isNaN(parseInt(values.get('schedule_interval'), 10))
        || values.get('schedule_interval').indexOf('.') > -1) {
      errors.schedule_interval = 'Schedule interval has to be an integer';
    }
    if (values.get('email_address', '').length === 0) {
      errors.email_address = 'Enter email address to send scheduled reports';
    }
  }
  return errors;
};

const config = [
  {
    label: 'Vulnerabilities',
    value: 'cve',
    filters: [
      {
        name: 'cve_severity',
        options: [
          {
            label: 'Critical',
            value: 'critical',
          },
          {
            label: 'High',
            value: 'high',
          },
          {
            label: 'Medium',
            value: 'medium',
          },
          {
            label: 'Low',
            value: 'low',
          },
        ],
      },
    ],
  },
];

const renderSubCheckboxGroup = (parentName, name, options, inputValue, onChange) => {
  const checkboxes = options.map(({label, value}, index) => {
    const handleChange = (event) => {
      const arr = inputValue.map((el) => {
        if (el.value === parentName) {
          const subInputValue = el[name] || [];
          const copyOfSubInputValue = [...subInputValue];
          if (event.target.checked) {
            copyOfSubInputValue.push(value);
          } else {
            copyOfSubInputValue.splice(copyOfSubInputValue.indexOf(value), 1);
          }
          return {
            ...el,
            [name]: copyOfSubInputValue,
          };
        }
        return {
          ...el
        };
      });
      return onChange(arr);
    };
    const indexedInputValue = inputValue.reduce((acc, el) => {
      acc[el.value] = el;
      return acc;
    }, {});
    const valueArr = indexedInputValue[parentName][name] || [];
    const checked = valueArr.includes(value);
    return (
      <div className="df-checkbox-button" key={value}>
        <input type="checkbox" name={`${name}[${index}]`} value={value} checked={checked} onChange={handleChange} />
        <label htmlFor={`${name}[${index}]`}>
          <span>{label}</span>
        </label>
      </div>
    );
  });

  return (
    <div className="sub-checkbox-group">
      <div className="heading" style={{paddingLeft: '0px'}}>
        {' '}
        {name.replace(/_/g, ' ')}
        {' '}
      </div>
      <div className="form-field justify-start df-checkbox-group horizontal">{checkboxes}</div>
    </div>
  );
};

const renderNestedCheckboxGroupField = ({input, meta, options}) => {
  const {name, onChange} = input;
  const {touched, error} = meta;
  const inputValue = input.value || [];

  const checkboxes = options.map(({label, value, filters}, index) => {
    const handleChange = (event) => {
      const arr = [...inputValue];
      if (event.target.checked) {
        arr.push({
          label,
          value,
        });
      } else {
        arr.splice(arr.findIndex(el => el.value === value), 1);
      }
      return onChange(arr);
    };
    const checked = inputValue.map(el => el.value).includes(value);
    return (
      <div className="df-checkbox-button" key={value}>
        <input type="checkbox" name={`${name}[${index}]`} value={value} checked={checked} onChange={handleChange} />
        <label htmlFor={`${name}[${index}]`}>
          <span>{label}</span>
        </label>
        {checked && filters.map(filterInst => (
          renderSubCheckboxGroup(value, filterInst.name,
            filterInst.options,
            inputValue,
            onChange)
        ))}
      </div>
    );
  });

  return (
    <div>
      <div className="heading" style={{paddingLeft: '0px', width: '200px'}}>Select Resources </div>
      <br />
      <div className="form-field">
        <div className="df-checkbox-group">{checkboxes}</div>
        {touched && error && <p className="message error-message">{error}</p>}
      </div>
    </div>
  );
};

const nodeTypeOption = [
  {id: 1, display: 'host', type: 'host'},
  {id: 2, display: 'container', type: 'container'},
  {id: 3, display: 'container image', type: 'container_image'},
  {id: 4, display: 'pod', type: 'pod'}
];

const durationOption = [
  {
    id: 1, display: 'last 1 day', number: '1', time_unit: 'day'
  },
  {
    id: 2, display: 'last 7 days', number: '7', time_unit: 'day'
  },
  {
    id: 3, display: 'last 30 days', number: '30', time_unit: 'day'
  },
  {
    id: 4, display: 'last 60 days', number: '60', time_unit: 'day'
  },
  {
    id: 5, display: 'last 90 days', number: '90', time_unit: 'day'
  },
  {
    id: 6, display: 'last 180 days', number: '180', time_unit: 'day'
  },
  {
    id: 7, display: 'All documents', number: '0', time_unit: 'all'
  }
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
    this.renderOne = this.renderOne.bind(this);
  }

  componentWillUnmount() {
    const {
      clearScheduledReportFormAction: action,
    } = this.props;
    action();
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    const {
      nodeType: {
        value: nodeTypeNew,
      } = {},
      selectedResources: newSelectedResources = [],
    } = newProps;
    const {
      nodeType: {
        value: nodeTypeOld,
      } = {},
      selectedResources = [],
      enumerateFiltersAction: action,
    } = this.props;

    const resourceType = newSelectedResources.map(el => el.value).join(',');

    if (nodeTypeNew !== nodeTypeOld || newSelectedResources !== selectedResources) {
      const params = {
        node_type: nodeTypeNew,
        resource_type: resourceType,
        filters: 'host_name,container_name,image_name_with_tag,os,kubernetes_cluster_name,kubernetes_namespace',
      };
      action(params);
    }

    // clearing previous filter values on change of node type
    if (nodeTypeNew !== nodeTypeOld) {
      const {
        topologyFilters: allFilters,
        change,
      } = this.props;

      const prevResourceType = selectedResources.map(el => el.value).join(',');
      const topologyFilters = allFilters.get(prevResourceType, []);
      topologyFilters.map(filter => change(filter.name, []));
    }
  }

  submitClickHandler(values) {
    const {handleSubmit} = this.props;
    handleSubmit(values);
  }

  renderOne(filter) {
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

  render() {
    const {
      duration: selectedDuration,
      selectedResources = [],
      pristine,
      submitting,
      loading,
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

    const resourceType = selectedResources.map(el => el.value).join(',');
    const topologyFilters = allFilters.get(resourceType, []);
    const showEmailField = scheduleInterval;
    const downloadButtonLabel = scheduleInterval ? 'Schedule Report' : 'Download';
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
            <Field
              name="resources"
              component={renderNestedCheckboxGroupField}
              options={config}
            />
          </div>
          <div className="nodes-filter-item" style={{marginLeft: '0px', width: '400px', fontSize: '14px'}}>
            <Field
              name="node_type"
              rootClassName="form-field dir-column"
              component={DFSearchableSelectField}
              options={options}
              buttonLabel="Node Type"
              clearable={false}
              placeholder="Select Node Type"
            />
          </div>
          <div className="nodes-filter-item" style={{marginLeft: '0px', width: '400px', fontSize: '14px'}}>
            <Field
              name="duration"
              rootClassName="form-field dir-column"
              component={DFSearchableSelectField}
              options={durationOptions}
              buttonLabel="Duration"
              value={options.filter(option => option.value === selectedDuration)}
              clearable={false}
              placeholder="Select Duration"
            />
          </div>
          {visibleFilters && visibleFilters.map(filter => this.renderOne(filter))}
          <Field
            component={renderField}
            type="text"
            label="Schedule Interval in days (optional)"
            name="schedule_interval"
          />
          <Field
            name="toggle"
            component={ToggleSwitchField}
            label="Include dead nodes"
          />
          {showEmailField &&
            <Field
              component={renderField}
              type="text"
              label="Email Address"
              name="email_address"
            />
          }
          <div className="form-field relative">
            <button
              className="primary-btn"
              type="submit"
              disabled={submitting || pristine}
            >
              {downloadButtonLabel}
            </button>
            {loading && (
            <div className="loader">
              <Loader
                small
                style={{
                  top: '25%', fontSize: '1.0rem', marginLeft: '1.0rem', marginTop: '-1.0rem'
                }} />
            </div>
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
  nodeType: selector(state, 'node_type'),
  scheduleInterval: selector(state, 'schedule_interval'),
  selectedResources: selector(state, 'resources'),
  loading: state.getIn(['report_download', 'xlsx', 'loading']),
  info: state.getIn(['report_download', 'xlsx', 'info']),
  filterOptions: state.get('report_filter_options'),
  topologyFilters: state.getIn(['nodesView', 'topologyFilters']),
});

let initialValues = Map({});
initialValues = initialValues.set('node_type', {
  label: 'Node Type',
  value: 'host',
});
initialValues = initialValues.set('toggle', true);

export default connect(mapStateToProps, {
  enumerateFiltersAction,
  clearScheduledReportFormAction,
})(reduxForm({
  form: 'integrations-download-form',
  initialValues,
  validate,
})(DownloadForm));
