/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Field, reduxForm, formValueSelector } from 'redux-form/immutable';
import { Map } from 'immutable';
import moment from 'moment';
import classnames from 'classnames';
import DFSearchableSelectField from '../../common/multi-select/app-searchable-field';
import ToggleSwitchField from '../../common/toggle-switch/redux-form-field';
import pollable from '../../common/header-view/pollable';
import injectModalTrigger from '../../common/generic-modal/modal-trigger-hoc';
import Loader from '../../loader';
import {
  enumerateFiltersAction,
  clearScheduledReportFormAction,
  reportGenerateAction,
  reportDownloadStatusAction,
  downloadReportAction,
  reportScheduleEmailAction,
} from '../../../actions/app-actions';

// Defining the options for all the dropdowns
const config = [
  {
    label: 'Vulnerabilities',
    value: 'cve',
  },
];

const cveSeverityOptions = [
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
];

const nodeTypeOption = [
  { label: 'host', value: 'host' },
  { label: 'container', value: 'container' },
  { label: 'container image', value: 'container_image' },
  { label: 'pod', value: 'pod' },
];

const downloadOptions = [
  { label: 'XLSX', value: 'xlsx' },
  { label: 'PDF', value: 'pdf' },
];

const durationOption = [
  {
    display: 'last 1 day',
    number: '1',
    time_unit: 'day',
  },
  {
    display: 'last 7 days',
    number: '7',
    time_unit: 'day',
  },
  {
    display: 'last 30 days',
    number: '30',
    time_unit: 'day',
  },
  {
    display: 'last 60 days',
    number: '60',
    time_unit: 'day',
  },
  {
    display: 'last 90 days',
    number: '90',
    time_unit: 'day',
  },
  {
    display: 'last 180 days',
    number: '180',
    time_unit: 'day',
  },
  {
    display: 'All documents',
    number: '0',
    time_unit: 'all',
  },
];

// A validate function to check if the user has selected atleast one option from the dropdowns
const validate = (values) => {
  const errors = {};
  if (values && values.get('node_type', '').length === 0) {
    errors.node_type = 'Select one node type';
  }
  if (values && values.get('duration', '').length === 0) {
    errors.duration = 'Choose a duration';
  }
  if (values && values.get('resource_type', []).length === 0) {
    errors.resource_type = 'Select atleast one resource';
  }
  if (values && values.get('download', '').length === 0) {
    errors.download_type = 'Select a download type';
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

// Function used to display the Scheduled Report Form
const renderField = ({
  input,
  type,
  label,
  meta: { touched, error, warning },
  disabled = false,
}) => (
  <div className="form-field">
    <span className="label">{label}</span>
    <br />
    <input {...input} type={type} disabled={disabled} />
    {touched && warning && (
      <div className="message warning-message">{warning}</div>
    )}
    {touched && error && <div className="message error-message">{error}</div>}
  </div>
);

const Reports = props => {
  const {
    resource_type,
    node_type,
    topologyFilters,
    duration,
    schedule_interval,
    pristine,
    submitting,
    loading,
    info,
    schedule_info,
    tableItems =[],
    download_type,
    errors,
  } = props;
  const showEmailField = schedule_interval;
  const downloadButtonLabel = schedule_interval
    ? 'Schedule Report'
    : 'Download';

  const [showModal, setShowModal] = useState(false);

// A hook to check for the report generation status by initiating a pollable request 
  useEffect(() => {
    const {
      registerPolling,
      startPolling,
    } = props;
    registerPolling(reportDownloadStatus);
    startPolling();
  }, [])

// A function to initiate the report generation
  useEffect(() => {
    if (resource_type && node_type) {
      const resourceTypeText = resource_type.map(el => el.value).join(',');
      const nodeTypeText = node_type.value;
      props.enumerateFiltersAction({
        resource_type: resourceTypeText,
        node_type: nodeTypeText,
        filters:
          'host_name,container_name,image_name_with_tag,os,kubernetes_cluster_name,kubernetes_namespace',
      });
    }
  }, [resource_type, node_type]);


// Function used to display the NodeType dropdown
  const renderOne = filter => {
    return (
      <div
        className="nodes-filter-item"
        style={{ marginLeft: '0px', width: '400px' }}
      >
        <Field
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
  };

  const renderCVESeverityDropdown = () => {
    return (
      <div
        className="nodes-filter-item"
        style={{ marginLeft: '0px', width: '400px' }}
      >
        <Field
          name="cve_severity"
          rootClassName="form-field dir-column"
          component={DFSearchableSelectField}
          options={cveSeverityOptions}
          buttonLabel="CVE Severity"
          clearable={false}
          placeholder="Select cve severity"
          isMulti
        />
      </div>
    );
  };

  const checkIfResourceSelected = resourceValue => {
    let selected = false;
    resource_type &&
      resource_type.map(item => {
        if (item.value === resourceValue) {
          selected = true;
        }
      });
    return selected;
  };

  const durationOptions = durationOption.map(el => ({
    value: JSON.stringify({
      number: el.number,
      time_unit: el.time_unit,
    }),
    label: el.display,
  }));

  const reportDownloadStatus = (pollParams) => {
    const {
      reportDownloadStatusAction: action,
    } = props;

    const {
      initiatedByPollable,
    } = pollParams;

    const params = {
      initiatedByPollable,
    };
    return action(params);
  }


  const downloadReportFile = (path) => {
    const {
      downloadReportAction: action,
    } = props;

    const params = {
      path,
    };

    return action(params);
  }

  const renderDownloadLink = (reportStatus = {}) => {
    const {
      status,
      report_path: filePath,
    } = reportStatus;

    const {
      fileDownloadStatusIm = Map(),
    } = props;

    const loading = fileDownloadStatusIm.getIn([filePath, 'loading']);

    if (status === 'Completed' && filePath) {
      return (
        <div>
          <span
            className={classnames('fa fa-download', { disabled: loading})}
            title="download"
            style={{cursor: 'pointer'}}
            onClick={() => { if (!loading) downloadReportFile(filePath)}}
          />
          {loading}
          {loading && <Loader style={{top: '25%', fontSize: '2.0rem'}} />}
        </div>
      );
    }
    return null;
  }

// Function that creates the params that need to be 
// sent to the API call to generate the report 
  const submitClickHandler = (e, props) => {
    e.preventDefault();
    if (resource_type && node_type) {
      const {
        resource_type,
        node_type,
        duration,
        schedule_interval,
        email_address,
        dead_nodes_toggle,
        host_name,
        container_name,
        image_name_with_tag,
        operating_system,
        kubernetes_cluster_name,
        kubernetes_namespace,
        cve_severity,
        download_type,
        reportGenerateAction: actionDownload,
        reportScheduleEmailAction: actionEmail,
      } = props;

      const resourceTypeText = resource_type.map(el => el.value).join(',');

      const resourceData = [];
      if (resourceTypeText && resourceTypeText.includes('cve') && cve_severity) {
        resourceData.push({
          type: 'cve',
          filter: { cve_severity: cve_severity.map(el => el.value).join(',') },
        });
      }
      if (resourceTypeText && resourceTypeText.includes('cve') && !cve_severity) { 
        resourceData.push({
          type: 'cve',
          filter: {},
        });
      }
      let globalFilter;
      const durationValues = duration && duration.value;
      const downloadTypeOption = download_type && download_type.value;
      if (node_type.value === 'host') {
        const hostName = host_name && host_name.map(v => v.value);
        const os = operating_system && operating_system.map(v => v.value);
        const k8sClusterName =
          kubernetes_cluster_name && kubernetes_cluster_name.map(v => v.value);
        globalFilter = {
          type: [node_type.value],
          host_name: hostName,
          os,
          kubernetes_cluster_name: k8sClusterName,
        };
      } else if (node_type.value === 'container') {
        const hostName = host_name && host_name.map(v => v.value);
        const containerName =
          container_name && container_name.map(v => v.value);
        const imageName =
          image_name_with_tag && image_name_with_tag.map(v => v.value);
        const k8sClusterName =
          kubernetes_cluster_name && kubernetes_cluster_name.map(v => v.value);
        globalFilter = {
          type: [node_type.value],
          host_name: hostName,
          container_name: containerName,
          image_name_with_tag: imageName,
          kubernetes_cluster_name: k8sClusterName,
        };
      } else if (node_type.value === 'container_image') {
        const imageName =
          image_name_with_tag && image_name_with_tag.map(v => v.value);
        globalFilter = {
          type: [node_type.value],
          image_name_with_tag: imageName,
        };
      } else if (node_type.value === 'pod') {
        const k8sClusterName =
          kubernetes_cluster_name && kubernetes_cluster_name.map(v => v.value);
        const k8sNamespace =
          kubernetes_namespace && kubernetes_namespace.map(v => v.value);
        globalFilter = {
          type: [node_type.value],
          kubernetes_cluster_name: k8sClusterName,
          kubernetes_namespace: k8sNamespace,
        };
      } else {
        globalFilter = {};
      }
      const scheduleInterval = schedule_interval;
      // Checking for the dead nodes toggle value by checking if the host name selceted or is empty
      let deadNodes;
      if (node_type.value === 'host' || node_type.value === 'container') {
        let lenHostName = 0;
        globalFilter.host_name &&
          globalFilter.host_name.map(x => (lenHostName = lenHostName + 1));
        deadNodes = dead_nodes_toggle ? true : false;
        if (lenHostName !== 0) {
          deadNodes = false;
        }
      }
      let params = {};
      // API params for schedule report generation
      if (scheduleInterval) {
        const emailAddress = email_address;
        params = {
          action: 'schedule_send_report',
          file_type: downloadTypeOption,
          node_type: node_type.value,
          include_dead_nodes: deadNodes,
          action_args: {
            cron: `0 4 */${scheduleInterval} * *`,
            report_email: emailAddress,
            resources: resourceData,
            filters: globalFilter,
            durationValues,
          },
        };
        return actionEmail(params);
      }
      // API params for report generation
      params = {
        action: 'download_report',
        file_type: downloadTypeOption,
        node_type: node_type.value,
        include_dead_nodes: deadNodes,
        action_args: {
          resources: resourceData,
          filters: globalFilter,
          durationValues,
        },
      };
      return actionDownload(params);
    }
  };

  return (
    <div>
      <div className="resource-download-form">
        <form
          className="df-modal-form"
          onSubmit={e => submitClickHandler(e, props)}
        >
          <div
            className="heading"
            style={{ paddingLeft: '0px', width: '200px' }}
          >
            Select Resources{' '}
          </div>
          <div className="resource-option-wrapper">
            <div
              className="nodes-filter-item"
              style={{ marginLeft: '0px', width: '400px' }}
            >
              <Field
                name="resource_type"
                rootClassName="form-field dir-column"
                component={DFSearchableSelectField}
                options={config}
                buttonLabel="Resource type"
                clearable={false}
                placeholder="Select resource type"
                isMulti
              />
              {errors && errors.resource_type && <div className="error-message">{errors.resource_type}</div>}
            </div>
          </div>
          <div>
            {checkIfResourceSelected('cve') && (
              <div>{renderCVESeverityDropdown()}</div>
            )}
          </div>
          <div className="resource-option-wrapper">
            <div
              className="nodes-filter-item"
              style={{ marginLeft: '0px', width: '400px' }}
            >
              <Field
                name="node_type"
                rootClassName="form-field dir-column"
                component={DFSearchableSelectField}
                options={nodeTypeOption}
                buttonLabel="Node type"
                clearable={false}
                placeholder="Select node type"
              />
            </div>
          </div>
          <div
            className="nodes-filter-item"
            style={{ marginLeft: '0px', width: '400px' }}
          >
            <Field
              name="duration"
              rootClassName="form-field dir-column"
              component={DFSearchableSelectField}
              options={durationOptions}
              buttonLabel="Duration"
              value={durationOptions.filter(
                option => option.value === duration
              )}
              clearable={false}
              placeholder="Select Duration"
            />
          </div>
          {errors && errors.duration && <div className="error-message">{errors.duration}</div>}
          <Field
            component={renderField}
            type="text"
            label="Schedule Interval in days (optional)"
            name="schedule_interval"
          />
          {showEmailField && (
            <Field
              component={renderField}
              type="text"
              label="Email Address"
              name="email_address"
            />
          )}
          <Field
            name="toggle"
            component={ToggleSwitchField}
            label="Include dead nodes"
          />
          {props.resource_type && props.resource_type.length > 0 && (
            <span
              onClick={() => setShowModal(true)}
              className="link"
              style={{ cursor: 'pointer', color: '#007FFF' }}
              aria-hidden="true"
            >
              Advanced
            </span>
          )}
          {showModal && (
            <div className="ReactModalPortal">
              <div
                className="ReactModal__Overlay ReactModal__Overlay--after-open"
                style={{
                  position: 'fixed',
                  inset: '0px',
                  backgroundColor: 'rgba(16, 16, 16, 0.8)',
                  zIndex: 100,
                }}
              >
                <div
                  className="ReactModal__Content ReactModal__Content--after-open"
                  role="dialog"
                  aria-modal="true"
                  style={{
                    position: 'absolute',
                    inset: '50% auto auto 50%',
                    border: '1px solid rgb(37, 37, 37)',
                    background: 'rgb(16, 16, 16)',
                    overflow: 'initial',
                    borderRadius: '4px',
                    outline: 'none',
                    padding: '0px',
                    margin: 'auto',
                    transform: 'translate(-50%, -50%)',
                    width: '450px',
                  }}
                >
                  <div className="df-generic-modal">
                    <div className="modal-header">
                      <span className="title">Filters</span>
                      <i
                        className="fa fa-close modal-close"
                        aria-hidden="true"
                        onClick={() => setShowModal(false)}
                      />
                    </div>
                    <div className="modal-body">
                      <div>
                        {resource_type &&
                          node_type &&
                          topologyFilters
                            .get(
                              resource_type.map(el => el.value).join(','),
                              []
                            )
                            .map(filter => renderOne(filter))}
                      </div>
                    </div>
                    <button
                      className="primary-btn"
                      type="submit"
                      style={{ margin: '10px 45px', padding: '5px' }}
                      onClick={() => setShowModal(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div
            className="nodes-filter-item"
            style={{ marginLeft: '0px', width: '400px', marginTop: '20px' }}
          >
            <Field
              name="download"
              rootClassName="form-field dir-column"
              component={DFSearchableSelectField}
              options={downloadOptions}
              buttonLabel="Download type"
              clearable={false}
              placeholder="Select download type"
            />
          </div>
          {errors && errors.download_type && <div className="error-message">{errors.download_type}</div>}
          <div className="form-field relative">
            <button
              className="primary-btn"
              type="submit"
              disabled={!duration || !download_type || submitting || pristine}
            >
              {downloadButtonLabel}
            </button>
            {loading && (
              <div className="loader">
                <Loader
                  small
                  style={{
                    top: '25%',
                    fontSize: '1.0rem',
                    marginLeft: '1.0rem',
                    marginTop: '-1.0rem',
                  }}
                />
              </div>
            )}
          </div>
          {info && <span className="message error-message"> {info} </span>}
          {schedule_info && <span className="message error-message"> {schedule_info} </span>}
        </form>
      </div>
      <div className="email-integration-collection-wrapper">
        <table className="table table-bordered table-striped">
          <thead>
            <th> Timestamp </th>
            <th> Report Type </th>
            <th> Filters Used </th>
            <th> Status </th>
            <th> Download </th>
          </thead>
          <tbody>
            {tableItems &&
              tableItems.map(key => (
                <tr>
                  <td>
                    {moment(key['@timestamp']).format(
                      'MMMM Do YYYY, h:mm:ss a'
                    )}
                  </td>
                  <td>
                    {key.file_type}
                  </td>
                  <td>{key.filters}</td>
                  <td>{key.status}</td>
                  <td>{renderDownloadLink(key)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const selector = formValueSelector('report-download-form');
const mapStateToProps = state => ({
  resource_type: selector(state, 'resource_type'),
  node_type: selector(state, 'node_type'),
  cve_severity: selector(state, 'cve_severity'),
  duration: selector(state, 'duration'),
  schedule_interval: selector(state, 'schedule_interval'),
  email_address: selector(state, 'email_address'),
  dead_nodes_toggle: selector(state, 'toggle'),
  download_type: selector(state, 'download'),
  errors: state.getIn(['form', 'report-download-form', 'syncErrors']),

  host_name: selector(state, 'host_name'),
  container_name: selector(state, 'container_name'),
  image_name_with_tag: selector(state, 'image_name_with_tag'),
  operating_system: selector(state, 'os'),
  kubernetes_cluster_name: selector(state, 'kubernetes_cluster_name'),
  kubernetes_namespace: selector(state, 'kubernetes_namespace'),

  loading: state.getIn(['reportForm', 'form', 'loading']),
  info: state.getIn(['reportForm', 'form', 'error', 'message']),
  schedule_info: state.getIn(['report', 'info']),

  topologyFilters: state.getIn(['nodesView', 'topologyFilters']),

  fileDownloadStatusIm: state.getIn(['reportForm', 'fileDownload']),
  tableItems: state.getIn(['reportForm', 'status', 'data']),
  initiatedByPollable: state.getIn(['reportForm', 'status', 'initiatedByPollable']),
});

let initialValues = Map({});
initialValues = initialValues.set('node_type', {
  label: 'Node Type',
  value: 'host',
});
initialValues = initialValues.set('toggle', true);

export default connect(mapStateToProps, {
  enumerateFiltersAction,
  reportGenerateAction,
  reportDownloadStatusAction,
  downloadReportAction,
  reportScheduleEmailAction,
  clearScheduledReportFormAction,
})(
  reduxForm({
    form: 'report-download-form',
    validate,
    initialValues,
  })(injectModalTrigger(pollable({
    pollingIntervalInSecs: 5,
  })(Reports)))
);
