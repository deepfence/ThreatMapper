/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Field, reduxForm, formValueSelector } from 'redux-form/immutable';
import { Map } from 'immutable';
import moment from 'moment';
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
  downloadPdfReportAction,
} from '../../../actions/app-actions';

const config = [
  {
    label: 'Alerts',
    value: 'alert',
  },
  {
    label: 'Vulnerabilities',
    value: 'cve',
  },
  {
    label: 'Compliance',
    value: 'compliance',
  },
];

const alertSeverityOptions = [
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

const complianceSeverityOptions = [
  {
    label: 'Standard',
    value: 'standard',
  },
  {
    label: 'CIS',
    value: 'cis',
  },
  {
    label: 'NIST Master',
    value: 'nist_master',
  },
  {
    label: 'NIST Slave',
    value: 'nist_slave',
  },
  {
    label: 'HIPAA',
    value: 'hipaa',
  },
  {
    label: 'PCI-DSS',
    value: 'pcidss',
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
    dead_nodes_toggle,
    tableItems =[],
  } = props;
  const showEmailField = schedule_interval;
  const downloadButtonLabel = schedule_interval
    ? 'Schedule Report'
    : 'Download';

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const {
      registerPolling,
      startPolling,
    } = props;
    registerPolling(reportDownloadStatus);
    startPolling();
  }, [])

  useEffect(() => {
    console.log('Reports props', props);
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

  const renderOne = filter => {
    console.log('renderOne is called!');
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

  const renderAlertSeverityDropdown = () => {
    return (
      <div
        className="nodes-filter-item"
        style={{ marginLeft: '0px', width: '400px' }}
      >
        <Field
          name="alert_severity"
          rootClassName="form-field dir-column"
          component={DFSearchableSelectField}
          options={alertSeverityOptions}
          buttonLabel="Alert Severity"
          clearable={false}
          placeholder="Select alert severity"
          isMulti
        />
      </div>
    );
  };

  const renderCveSeverityDropdown = () => {
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

  const renderComplianceSeverityDropdown = () => {
    return (
      <div
        className="nodes-filter-item"
        style={{ marginLeft: '0px', width: '400px' }}
      >
        <Field
          name="compliance_severity"
          rootClassName="form-field dir-column"
          component={DFSearchableSelectField}
          options={complianceSeverityOptions}
          buttonLabel="Compliance Severity"
          clearable={false}
          placeholder="Select compliance severity"
          isMulti
        />
      </div>
    );
  };

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


  // const downloadReportFile = (path) => {
  //   const {
  //     downloadPdfReportAction: action,
  //   } = props;

  //   const params = {
  //     path,
  //   };

  //   return action(params);
  // }

  // const renderDownloadLink = (pdfStatus = {}) => {
  //   const {
  //     status,
  //     file_path: filePath,
  //   } = pdfStatus;

  //   const {
  //     fileDownloadStatusIm = Map(),
  //   } = props;

  //   const loading = fileDownloadStatusIm.getIn([filePath, 'loading']);

  //   if (status === 'Completed' && filePath) {
  //     return (
  //       <div>
  //         <span
  //           className={classnames('fa fa-download', { disabled: loading})}
  //           title="download"
  //           style={{cursor: 'pointer'}}
  //           onClick={() => { if (!loading) downloadReportFile(filePath)}}
  //         />
  //         {loading}
  //         {loading && <Loader style={{top: '25%', fontSize: '2.0rem'}} />}
  //       </div>
  //     );
  //   }
  //   return null;
  // }

  const submitClickHandler = (e, props) => {
    e.preventDefault();
    console.log('submitClickHandler is called!');
    console.log('props', props);
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
        alert_severity,
        cve_severity,
        compliance_severity,
        downloadType,
        reportGenerateAction: actionDownload,
      } = props;

      const resourceTypeText = resource_type.map(el => el.value).join(',');

      const resourceData = [];
      if (resourceTypeText && resourceTypeText.includes('alert')) {
        resourceData.push({
          type: 'alert',
          filter: { severity: alert_severity.map(el => el.value).join(',') },
        });
      }
      if (resourceTypeText && resourceTypeText.includes('cve')) {
        resourceData.push({
          type: 'cve',
          filter: { cve_severity: cve_severity.map(el => el.value).join(',') },
        });
      }
      if (resourceTypeText && resourceTypeText.includes('compliance')) {
        resourceData.push({
          type: 'compliance',
          filter: {
            compliance_check_type: compliance_severity
              .map(el => el.value)
              .join(','),
          },
        });
      }
      let globalFilter;
      const durationValues = duration.value;
      const downloadTypeOption = downloadType.value;
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
        console.log('CONTAINER IMAGE', 'image_name_with_tag: ', imageName);
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
      let deadNodes;
      if (node_type.value === 'host' || node_type.value === 'container') {
        let lenHostName = 0;
        console.log(lenHostName);
        globalFilter.host_name &&
          globalFilter.host_name.map(x => (lenHostName = lenHostName + 1));
        deadNodes = dead_nodes_toggle ? true : false;
        if (lenHostName !== 0) {
          deadNodes = false;
        }
      }
      let params = {};
      if (scheduleInterval) {
        const emailAddress = email_address;
        console.log(
          'scheduleInterval',
          'node_type: ',
          node_type,
          'include_dead_nodes: ',
          deadNodes,
          'report_email: ',
          emailAddress,
          'node_type: ',
          node_type,
          'resources :',
          resourceData,
          'filters: ',
          globalFilter,
          'duration: ',
          durationValues
        );
        params = {
          action: 'schedule_send_report',
          file_type: downloadTypeOption,
          node_type: node_type,
          include_dead_nodes: deadNodes,
          action_args: {
            cron: `0 4 */${scheduleInterval} * *`,
            report_email: emailAddress,
            node_type: node_type.value,
            resources,
            filters: globalFilter,
            durationValues,
          },
        };
        // return xlsxScheduleEmailAction(params);
      }
      console.log(
        'download_report',
        'node_type: ',
        node_type.value,
        'include_dead_nodes: ',
        deadNodes,
        'resources :',
        resourceData,
        'filters: ',
        globalFilter,
        'duration: ',
        durationValues,
        'download Type',
        downloadTypeOption
      );
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
            </div>
          </div>
          <div>
            {checkIfResourceSelected('alert') && (
              <div>{renderAlertSeverityDropdown()}</div>
            )}
          </div>
          <div>
            {checkIfResourceSelected('cve') && (
              <div>{renderCveSeverityDropdown()}</div>
            )}
          </div>
          <div>
            {checkIfResourceSelected('compliance') && (
              <div>{renderComplianceSeverityDropdown()}</div>
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
                    {key.report_type === 'cve'
                      ? 'vulnerability'
                      : key.report_type}
                  </td>
                  <td>{key.filters}</td>
                  <td>{key.status}</td>
                  {/* <td>{renderDownloadLink(key)}</td> */}
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
  alert_severity: selector(state, 'alert_severity'),
  cve_severity: selector(state, 'cve_severity'),
  compliance_severity: selector(state, 'compliance_severity'),
  duration: selector(state, 'duration'),
  schedule_interval: selector(state, 'schedule_interval'),
  dead_nodes_toggle: selector(state, 'toggle'),
  downloadType: selector(state, 'download'),

  host_name: selector(state, 'host_name'),
  container_name: selector(state, 'container_name'),
  image_name_with_tag: selector(state, 'image_name_with_tag'),
  operating_system: selector(state, 'os'),
  kubernetes_cluster_name: selector(state, 'kubernetes_cluster_name'),
  kubernetes_namespace: selector(state, 'kubernetes_namespace'),

  loading: state.getIn(['report_download', 'xlsx', 'loading']),
  info: state.getIn(['report_download', 'xlsx', 'info']),

  topologyFilters: state.getIn(['nodesView', 'topologyFilters']),

  // fileDownloadStatusIm: state.getIn(['pdfReportForm', 'fileDownload']),
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
  clearScheduledReportFormAction,
})(
  reduxForm({
    form: 'report-download-form',
    initialValues,
    validate,
  })(injectModalTrigger(pollable({
    pollingIntervalInSecs: 5,
  })(Reports)))
);
