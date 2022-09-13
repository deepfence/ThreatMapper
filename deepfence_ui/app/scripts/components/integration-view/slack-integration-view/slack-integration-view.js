/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';

// Custom component imports
import SeverityDropdownView from '../../common/severity-radio-button-collection/severity-radio-button-collection';
import DFSelect from '../../common/multi-select/app';
import IntegrationTableView from '../../common/integration-table-view/integration-table-view';

import {
  requestIntegrationDelete,
  resetIntegrationStates,
  submitIntegrationRequest,
  showModal,
  enumerateFiltersAction,
} from '../../../actions/app-actions';
import { getIntegrations } from '../../../utils/web-api-utils';
import { DURATION_DROPDOWN_COLLECTION } from '../../../constants/dropdown-option-collection';
import AppLoader from '../../common/app-loader/app-loader';
import {
  FEATURE_BLOCKED_ALERT_MESSAGE,
  NO_INTEGRATION_FOUND_ALERT_MESSAGE,
} from '../../../constants/visualization-config';
import AdvanceFilterOption, {
  AdvancedFilterModalContent,
} from '../advance-filter-modal';
const resourceCollection = [
  {
    name: 'Vulnerabilities',
    value: 'vulnerability',
  },
  {
    name: 'Compliance Results',
    value: 'compliance',
  },
  {
    name: 'CloudTrail Alerts',
    value: 'cloudtrail_alert',
  },
];

const allNodeType = 'host,container_image,pod,aws';

class SlackIntegrationView extends React.Component {
  constructor() {
    super();
    this.state = {
      webHookUrl: '',
      slackChannel: '',
      severity: '',
      isSuccess: false,
      isError: false,
      duration: '',
      submitted: false,
      filters: {},
      cloudTrailValue: {},
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleRadioButtonState = this.handleRadioButtonState.bind(this);
    this.handleDurationDropDownState =
      this.handleDurationDropDownState.bind(this);
    this.deleteIntegration = this.deleteIntegration.bind(this);
    this.handleDeleteDialog = this.handleDeleteDialog.bind(this);
    this.handleResourceChange = this.handleResourceChange.bind(this);
    this.getModalContent = this.getModalContent.bind(this);
    this.seCloudtrailOptions = this.seCloudtrailOptions.bind(this);
  }

  componentDidMount() {
    this.resetStates();
    this.fetchIntegrationList();
    this.getFilters();
  }

  getFilters() {
    const { dispatch } = this.props;

    const params = {
      node_type: allNodeType,
      filters:
        'host_name,container_name,image_name_with_tag,user_defined_tags,kubernetes_namespace,kubernetes_cluster_name,cloudtrail_trail',
    };
    return dispatch(enumerateFiltersAction(params));
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    if (newProps.isSuccess && !newProps.isError) {
      this.setState({
        integrationAddResponse: newProps.integrationAddResponse,
        isSuccess: newProps.isSuccess,
        isError: newProps.isError,
      });
    } else if (!newProps.isSuccess && newProps.isError) {
      this.setState({
        integrationAddResponse: newProps.integrationAddResponse,
        isSuccess: newProps.isSuccess,
        isError: newProps.isError,
      });
    }

    const { integrationAddResponse: currIntegrationAddResponse } = this.props;
    if (newProps.integrationAddResponse !== currIntegrationAddResponse) {
      this.setState({
        integrationAddResponse: newProps.integrationAddResponse,
      });
    }

    if (newProps.availableSlackIntegrations && newProps.licenseResponse) {
      this.setState({
        availableSlackIntegrations: newProps.availableSlackIntegrations,
      });
    }
  }

  componentWillUnmount() {
    this.setState({
      isSuccess: false,
      isError: false,
    });
  }

  resetStates() {
    this.props.dispatch(resetIntegrationStates());
  }

  fetchIntegrationList() {
    getIntegrations(this.props.dispatch);
  }

  handleChange(e) {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  }

  handleRadioButtonState(selectedSeverity) {
    this.setState({
      severity: selectedSeverity,
    });
  }

  handleDurationDropDownState(selectedDuration) {
    this.setState({
      duration: selectedDuration,
    });
  }

  handleResourceChange(e) {
    const selectedOption = e;
    let showSeverityOptions = false;
    let showDurationOptions = false;
    let duration = 0;
    this.setState({
      docType: selectedOption,
      showSeverityOptions,
      showDurationOptions,
      resourceType: selectedOption,
      severity: '',
      duration,
    });
  }

  handleSubmit(e) {
    e.preventDefault();
    this.setState({ submitted: true });
    const {
      webHookUrl,
      slackChannel,
      severity,
      duration = {},
      resourceType,
      filters,
      cloudTrailValue,
    } = this.state;

    if (!resourceType) {
      this.setState({
        integrationAddResponse: 'Resource selection in mandatory',
        isError: true,
      });
      return;
    }

    if (resourceType && resourceType.value === 'cloudtrail_alerts') {
      if (Object.keys(cloudTrailValue).length === 0) {
        this.setState({
          integrationAddResponse: 'CloudTrail selection in mandatory',
          isError: true,
        });
        return;
      }
    }

    this.setState({
      integrationAddResponse: '',
      isError: false,
    });

    const apiFilters = Object.keys(filters).reduce((acc, key) => {
      acc[key] = filters[key].map(el => el.value);
      return acc;
    }, {});

    const apiCloudTrailFilters = Object.keys(cloudTrailValue).reduce(
      (acc, key) => {
        acc[key] = cloudTrailValue[key].map(el => el.value);
        return acc;
      },
      {}
    );

    const filterObject = {
      ...apiFilters,
      ...apiCloudTrailFilters,
    };

    if (webHookUrl && slackChannel) {
      let params = {
        webhook_url: webHookUrl,
        channel: slackChannel,
        alert_level: severity,
        duration: duration.value,
        integration_type: 'slack',
        notification_type: resourceType.value,
        filters: filterObject,
      };
      this.props.dispatch(submitIntegrationRequest(params));
    }
  }

  /*getDisabledBtnView(){
    return(
      <button type='button' className='app-btn'>Subscribe for Alerts</button>
    )
  };*/

  getEnabledBtnView() {
    return (
      <button type="button" className="app-btn" onClick={this.handleSubmit}>
        Subscribe
      </button>
    );
  }

  getModalContent() {
    const setFilters = filters => {
      this.setState({ filters });
    };

    return (
      <AdvancedFilterModalContent
        nodeFilters={this.props.nodeFilters}
        initialFilters={this.state.filters}
        onFiltersChanged={setFilters}
      />
    );
  }

  seCloudtrailOptions(name, value) {
    this.setState({
      cloudTrailValue: {
        ...this.state.cloudTrailValue,
        cloudtrail_trail: value,
      },
    });
  }

  getSlackIntegrationFormView() {
    const {
      webHookUrl,
      slackChannel,
      submitted,
      resourceType,
      cloudTrailValue,
    } = this.state;
    const { showSeverityOptions = false, showDurationOptions = false } =
      this.state;
    const cloudTrailOptions =
      this.props.nodeFilters &&
      this.props.nodeFilters.filter(item => {
        if (item.label === 'CloudTrail') return item;
      });
    return (
      <div className="form-wrapper">
        <form name="form">
          <div className="row">
            <div className="col-12 col-md-8">
              <div className="row">
                <div className="col">
                  <div
                    className={
                      'form-group' +
                      (submitted && !webHookUrl ? ' has-error' : '')
                    }
                  >
                    <label htmlFor="webHookUrl">
                      <i className="fa fa-link" aria-hidden="true"></i>
                      <input
                        type="text"
                        className="form-control"
                        name="webHookUrl"
                        placeholder="Slack Webhook Url"
                        value={webHookUrl}
                        onChange={this.handleChange}
                      />
                      <span className="help-text">
                        Ex.
                        https://hooks.slack.com/services/T0000/B00000/XXXXXXXXX
                      </span>
                    </label>
                    {submitted && !webHookUrl && (
                      <div className="field-error">Webhook url is required</div>
                    )}
                  </div>
                </div>
                <div className="col">
                  <div
                    className={
                      'form-group' +
                      (submitted && !slackChannel ? ' has-error' : '')
                    }
                  >
                    <label htmlFor="slackChannel">
                      <i className="fa fa-slack" aria-hidden="true"></i>
                      <input
                        type="text"
                        className="form-control"
                        name="slackChannel"
                        placeholder="Slack Channel"
                        value={slackChannel}
                        onChange={this.handleChange}
                      />
                    </label>
                    {submitted && !slackChannel && (
                      <div className="field-error">Channel is required</div>
                    )}
                  </div>
                  {/* <div className="form-group" style={{marginTop: '60px'}}>
              { this.getEnabledBtnView() }
            </div> */}
                </div>
              </div>

              <div
                className="severity-option-wrapper"
                onChange={this.handleResourceChange}
              >
                <div className="wrapper-heading">Choose Resource*</div>
                <div className="resource-option-wrapper">
                  <div className="df-select-field">
                    <DFSelect
                      options={resourceCollection.map(el => ({
                        value: el.value,
                        label: el.name,
                      }))}
                      onChange={this.handleResourceChange}
                      placeholder="Resources"
                      value={this.state.resourceType}
                      clearable={false}
                    />
                  </div>
                </div>
              </div>
              {resourceType && resourceType.value === 'cloudtrail_alert' && (
                <div className="row">
                  <div className="col">
                    <div
                      className="form-group df-select-field"
                      style={{ width: '250px' }}
                    >
                      {cloudTrailOptions.map(filter => (
                        <div className="search-form">
                          <br />
                          <DFSelect
                            options={filter.options.map(el => ({
                              label: el,
                              value: el,
                            }))}
                            name={filter.name}
                            placeholder={`${filter.label}`}
                            onChange={selectedOptions =>
                              this.seCloudtrailOptions(
                                filter.name,
                                selectedOptions
                              )
                            }
                            value={cloudTrailValue[filter.name]}
                            isMulti
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <br />
              <div className="row">
                {showSeverityOptions && (
                  <div className="col-md-6">
                    <div className="severity-container">
                      <SeverityDropdownView
                        onDropdownCheckedCallback={value =>
                          this.handleRadioButtonState(value)
                        }
                      />
                    </div>
                  </div>
                )}
                <div className="col-md-6">
                  {showDurationOptions && (
                    <div className="duration-container df-select-field">
                      <DFSelect
                        options={DURATION_DROPDOWN_COLLECTION.options.map(
                          el => ({ value: el.value, label: el.display })
                        )}
                        onChange={this.handleDurationDropDownState}
                        placeholder={DURATION_DROPDOWN_COLLECTION.heading}
                        value={this.state.duration}
                        clearable={false}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="error-msg-container">
                {this.state.isError && (
                  <div className="auth-error-msg">
                    {this.state.integrationAddResponse}
                  </div>
                )}
              </div>
              {resourceType && resourceType.value !== 'cloudtrail_alert' && (
                <div>
                  <AdvanceFilterOption
                    modalContent={this.getModalContent}
                    filters={this.props.nodeFilters}
                  />
                </div>
              )}
              <br />
              <div className="form-group">{this.getEnabledBtnView()}</div>
              <div className="error-msg-container">
                {this.state.isSuccess && (
                  <div className="auth-success-msg">
                    {this.state.integrationAddResponse}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  deleteIntegration(record) {
    let params = {
      id: record.id,
      notification_type: record.notification_type,
    };
    return this.props.dispatch(requestIntegrationDelete(params));
  }

  handleDeleteDialog(record) {
    this.resetStates();
    const params = {
      dialogTitle: 'Delete Integration?',
      dialogBody: 'Are you sure you want to delete the Slack integration?',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'No, Keep',
      onConfirmButtonClick: () => this.deleteIntegration(record),
    };
    this.props.dispatch(showModal('DIALOG_MODAL', params));
  }

  getIntegrationTableView() {
    return (
      <IntegrationTableView
        recordCollection={this.props.availableSlackIntegrations}
        onDeleteRequestCallback={record => this.handleDeleteDialog(record)}
      />
    );
  }

  getTableEmptyState(data) {
    const emptyStateWrapper = {
      height: '400px',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
    return (
      <div style={emptyStateWrapper}>
        {data == undefined ? <AppLoader /> : this.getEmptyStateView()}
      </div>
    );
  }

  getEmptyStateView() {
    return (
      <div className="empty-state-wrapper">
        {NO_INTEGRATION_FOUND_ALERT_MESSAGE.message}
      </div>
    );
  }

  isDataAvailable(data) {
    let result;
    if (data && data.length > 0) {
      result = true;
    } else {
      result = false;
    }
    return result;
  }

  render() {
    const { availableSlackIntegrations } = this.props;
    return (
      <div className="email-integration-view-wrapper">
        <div className="integration-form-section">
          {this.getSlackIntegrationFormView()}
        </div>
        <div
          className="integration-list-section"
          style={{ marginLeft: '-6px' }}
        >
          {this.isDataAvailable(availableSlackIntegrations)
            ? this.getIntegrationTableView()
            : this.getTableEmptyState(availableSlackIntegrations)}
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    isSuccess: state.get('isSuccess'),
    isError: state.get('isError'),
    integrationAddResponse: state.get('integrationAddResponse'),
    availableSlackIntegrations: state.get('availableSlackIntegrations'),
    licenseResponse: state.get('licenseResponse'),
    nodeFilters: state.getIn(['nodesView', 'topologyFilters', allNodeType]),
  };
}

export default connect(mapStateToProps)(SlackIntegrationView);
