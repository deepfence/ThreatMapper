import React from 'react';
import { connect } from 'react-redux';
import { reduxForm, Field, formValueSelector } from 'redux-form/immutable';
import { Map } from 'immutable';
import Loader from '../../common/app-loader/horizontal-dots-loader';
import DFSearchableSelectField from '../../common/multi-select/app-searchable-field';
import {
  clearScanContainerImageRegistryAction,
  getRegistryImagesTagsAction,
} from '../../../actions/app-actions';

const ScheduleOption = [
  {
    value: 'schedule',
    label: 'Check and scan for new images everyday',
  },
];

const ScanTimestampOption = [
  {
    value: 'latest_timestamp',
    label: 'Scan by latest timestamp',
  },
];

const ScanImageTagOption = [
  {
    value: 'image_tags',
    label: 'Scan by registry image tags',
  },
];

const ScanAllTagsOption = [
  {
    value: 'scanAll',
    label: 'Scan all image tags',
  },
];

const renderCheckboxGroupField = ({ input, meta, options }) => {
  const { name, onChange } = input;
  const { touched, error } = meta;
  const inputValue = input.value;

  const checkboxes = options.map(({ label, value, disabled }, index) => {
    const handleChange = (event) => {
      const arr = [...inputValue];
      if (event.target.checked) {
        arr.push(value);
      } else {
        arr.splice(arr.indexOf(value), 1);
      }
      return onChange(arr);
    };
    const checked = inputValue.includes(value);
    return (
      <div className="df-checkbox-button" key="label">
        <input
          type="checkbox"
          name={`${name}[${index}]`}
          value={value}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
        />
        <label htmlFor={`${name}[${index}]`}>
          <span>{label}</span>
        </label>
      </div>
    );
  });

  return (
    <div>
      <div className="df-checkbox-group">{checkboxes}</div>
      {touched && error && <p className="error">{error}</p>}
    </div>
  );
};

const renderRadioButtonGroup = ({
  input,
  name,
  options,
  meta: {
    error,
    warning,
    touched,
  },
}) => (
  <div>
    <div className="radio-group">
      {options.map(option => (
        <div className="radio-item" key="name">
          <label htmlFor="intent">
            <input
              {...input}
              name={name}
              type="radio"
              value={option.value}
              checked={input.value === option.value}
            /> {option.label}
            <span className="check" />
          </label>
        </div>
      ))}
      {touched && error && <div className="error-message">{error}</div>}
      {touched && warning && <div className="warning-message">{warning}</div>}
    </div>
  </div>
);

class RegistryScanForm extends React.PureComponent {

  constructor(props) {
    super(props);
    this.state = {};
    this.submitClickHandler = this.submitClickHandler.bind(this);
  }

  componentDidMount() {
    const {
      clearScanContainerImageRegistryAction: clearAction,
      getRegistryImagesTagsAction: getTagsAction,
      selectedDocIndex
    } = this.props;
    const registryValues = Object.entries(selectedDocIndex);
    const registryIdValue = registryValues.map(el => el[1].id);
    const registryId = registryIdValue[0];
    clearAction();
    getTagsAction({ registry_id: registryId });
  }

  submitClickHandler(values) {
    const { handleSubmit } = this.props;
    return handleSubmit(values);
  }

  toggleState() {
    const { showAdvancedOptions } = this.state;
    this.setState(
      { showAdvancedOptions: !showAdvancedOptions },
    );
  }

  render() {
    const {
      submitting,
      userDefinedTags,
      loading = false,
      message,
      errorMessage,
      scheduleInterval,
      scheduleScan,
      registryImagesTags,
      scanRegistryType
    } = this.props;
    const tagList = userDefinedTags ? userDefinedTags.split(',') : [];
    const tagOptions = tagList.map(el => ({
      label: el,
      value: el,
    }));

    const showAdvancedOptionsLink = tagOptions.length > 0;
    const {
      showAdvancedOptions,
    } = this.state;
    const scanButtonLabel = scheduleInterval?.length || scheduleScan?.length ? 'Schedule Scan' : 'Scan Now';
    const registryImageTagsOptions = registryImagesTags ? registryImagesTags.map(el => ({
      label: el,
      value: el,
    })) : [];
    return (
      <div className="node-cve">
        <div className="cve-scan-form">
          <div className="title">
            Start a new scan
          </div>
          <form onSubmit={this.submitClickHandler} autoComplete="off">
            {showAdvancedOptionsLink && <div className="form-field">
              <span
                onClick={this.toggleState}
                className="link"
              >
                <i className={`fa ${showAdvancedOptions ? 'fa-caret-down' : 'fa-caret-right'}`} />&nbsp;&nbsp;Advanced Options
              </span>
            </div>}
            {showAdvancedOptions && <div className="form-field">
              <div className="sub-heading"> Start scan on all nodes with the chosen tags </div>
              <Field
                component={renderCheckboxGroupField}
                options={tagOptions}
                name="taglist"
              />
            </div>}
            <Field
              name="scanRegistryType"
              component={renderRadioButtonGroup}
              options={ScanTimestampOption}
            />
            <Field
              name="scanRegistryType"
              component={renderRadioButtonGroup}
              options={ScanImageTagOption}
            />
            {(scanRegistryType && scanRegistryType === 'image_tags') &&
              <Field
                name="registry_image_tags"
                component={DFSearchableSelectField}
                options={registryImageTagsOptions}
                buttonLabel='Image Tags'
                placeholder="Search by image tags"
                isMulti
                isSearchable
              />
            }
            <Field
              name="scanRegistryType"
              component={renderRadioButtonGroup}
              options={ScanAllTagsOption}
            />
            <div className="form-field">
              <span className="label">
                Scan Interval in days (optional)
              </span>
              <Field
                component="input"
                type="text"
                name="scheduleInterval"
              />
            </div>
            <Field
              component={renderCheckboxGroupField}
              options={ScheduleOption}
              name="scheduleScan"
            />
            <div className="form-field">
              <button
                className="primary-btn full-width relative"
                type="submit"
                disabled={submitting}
              >
                {scanButtonLabel}
              </button>
              {loading && <Loader style={{ right: '4%', top: '0%' }} />}
            </div>
            <div>
              {message &&
                <span className="message">
                  {message}
                </span>
              }
              {errorMessage &&
                <span className="error-message">
                  {errorMessage}
                </span>
              }
            </div>
          </form>
        </div>
      </div>
    );
  }
}

const cveScanFormSelector = formValueSelector('registry-secrets-scan');
const mapStateToProps = state => ({
  loading: state.getIn(['cve', 'container_image_registry', 'scan_registry', 'loading']),
  errorMessage: state.getIn(['cve', 'container_image_registry', 'scan_registry', 'error', 'message']),
  message: state.getIn(['cve', 'container_image_registry', 'scan_registry', 'message']),
  scheduleInterval: cveScanFormSelector(state, 'scheduleInterval'),
  scheduleScan: cveScanFormSelector(state, 'scheduleScan'),
  registryImagesTags: state.getIn(['registry_images_tags']),
  scanRegistryType: cveScanFormSelector(state, 'scanRegistryType'),
});

export default reduxForm({
  form: 'registry-secrets-scan',
  initialValues: Map({
    scanRegistryType: 'latest_timestamp',
  }),
})(connect(mapStateToProps, {
  clearScanContainerImageRegistryAction,
  getRegistryImagesTagsAction,
})(RegistryScanForm));
