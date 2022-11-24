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
  // {
  //   name: 'AWS Security Hub',
  //   value: 'aws_security_hub',
  // },
];

const allNodeType = 'host,container_image,pod,aws';

class AWSSecurityHubIntegrationView extends React.Component {
  constructor() {
    super();
    this.state = {
      email: '',
      severity: '',
      isSuccess: false,
      isError: false,
      duration: '',
      submitted: false,
      filters: {},
      cloudTrailValue: {},
      awsSecurityAccountFilter: {},
      awsAccessKey: '',
      awsSecretKey: '',
      awsRegion: '',
      resourceType: '',
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleResourceChange = this.handleResourceChange.bind(this);
    this.handleRadioButtonState = this.handleRadioButtonState.bind(this);
    this.handleDurationDropDownState =
      this.handleDurationDropDownState.bind(this);
    this.deleteIntegration = this.deleteIntegration.bind(this);
    this.handleDeleteDialog = this.handleDeleteDialog.bind(this);
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
        'host_name,container_name,image_name_with_tag,user_defined_tags,kubernetes_namespace,kubernetes_cluster_name,cloudtrail_trail,aws_account_id',
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

    if (newProps.availableAWSSecurityHubIntegrations && newProps.licenseResponse) {
      this.setState({
        availableAWSSecurityHubIntegrations: newProps.availableAWSSecurityHubIntegrations,
        isDemoModeEnabled: newProps.licenseResponse.demo_mode,
      });
    }
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
      severity,
      duration = {},
      resourceType,
      filters,
      cloudTrailValue,
      awsSecurityAccountFilter,
    } = this.state;

    if (!resourceType) {
      this.setState({
        isError: true,
      });
      return;
    }

    if (resourceType && resourceType.value === 'cloudtrail_alerts') {
      if (Object.keys(cloudTrailValue).length === 0) {
        this.setState({
          integrationAddResponse: 'CloudTrail selection is mandatory',
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

    const apiAWSAccountFilters = Object.keys(awsSecurityAccountFilter).reduce(
      (acc, key) => {
        acc[key] = awsSecurityAccountFilter[key].map(el => el.value);
        return acc;
      },
      {}
    );

    const filterObject = {
      ...apiFilters,
      ...apiCloudTrailFilters,
      ...apiAWSAccountFilters,
    };

    let params = {
      // alert_level: severity,
      // duration: duration.value,
      aws_access_key: this.state.awsAccessKey,
      aws_secret_key: this.state.awsSecretKey,
      region_name: this.state.awsRegion,
      integration_type: 'aws_security_hub',
      notification_type: resourceType.value,
      filters: filterObject,
    };

    this.props.dispatch(submitIntegrationRequest(params));
  }

  getDisabledBtnView() {
    return (
      <button type="button" className="app-btn">
        Subscribe
      </button>
    );
  }

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
  setAwsSecurityOptions(name, value) {
    this.setState({
      awsSecurityAccountFilter: {
        ...this.state.awsSecurityAccountFilter,
        aws_account_id: value,
      },
    });
  }

  getIntegrationFormView() {
    const {
      submitted,
      isDemoModeEnabled,
      resourceType,
      cloudTrailValue,
      awsSecurityAccountFilter,
    } = this.state;
    const {
      showSeverityOptions = false,
      showDurationOptions = false,
      awsAccessKey,
      awsSecretKey,
      awsRegion,
    } = this.state;
    const cloudTrailOptions =
      this.props.nodeFilters &&
      this.props.nodeFilters.filter(item => {
        if (item.label === 'CloudTrail') return item;
      });
    const columnStyle = {
      padding: '0px 60px',
    };
    // creating accounts options
    const AWSAccountOptions =
      this.props.nodeFilters &&
      this.props.nodeFilters.filter(item => {
        if (item.name === 'aws_account_id') return item;
      });

    return (
      <div className="form-wrapper">
        <form name="form">
          <div className="" style={{ columnStyle }}>
            <div className="row">
              <div className="col-md-4">
                <div
                  className={`form-group ${
                    submitted && !awsAccessKey ? 'has-error' : ''
                  }`}
                >
                  <label htmlFor="awsAccessKey">
                    <i className="fa fa-key" aria-hidden="true" />
                    <input
                      type="text"
                      className="form-control"
                      name="awsAccessKey"
                      placeholder="AWS Access Key"
                      value={awsAccessKey}
                      onChange={this.handleChange}
                      autoComplete="off"
                    />
                  </label>
                  {submitted && !awsAccessKey && (
                    <div className="field-error">
                      AWS Access Key is required
                    </div>
                  )}
                </div>
              </div>
              <div className="col-md-4">
                <div
                  className={`form-group ${
                    submitted && !awsSecretKey ? 'has-error' : ''
                  }`}
                >
                  <label htmlFor="awsSecretKey">
                    <i className="fa fa-key" aria-hidden="true" />
                    <input
                      type="text"
                      className="form-control"
                      name="awsSecretKey"
                      placeholder="AWS Secret Key"
                      value={awsSecretKey}
                      onChange={this.handleChange}
                      autoComplete="off"
                    />
                  </label>
                  {submitted && !awsSecretKey && (
                    <div className="field-error">
                      AWS Secret Key is required
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col-md-4">
                <div
                  className={`form-group ${
                    submitted && !awsRegion ? 'has-error' : ''
                  }`}
                >
                  <label htmlFor="awsRegion">
                    <i className="fa fa-globe" aria-hidden="true" />
                    <input
                      type="text"
                      className="form-control"
                      name="awsRegion"
                      placeholder="AWS Region"
                      value={awsRegion}
                      onChange={this.handleChange}
                      autoComplete="off"
                    />
                  </label>
                  {submitted && !awsRegion && (
                    <div className="field-error">AWS Region is required</div>
                  )}
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-4">
                <div
                  className="severity-option-wrapper"
                  onChange={this.handleResourceChange}
                >
                  <div className="wrapper-heading">Choose Resource*</div>
                  <div className="resource-option-wrapper">
                    <div className="form-group df-select-field">
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
                      {submitted && !resourceType && (
                        <div
                          className="field-error"
                          style={{
                            marginTop: '10px',
                          }}
                        >
                          Resource selection is required
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group df-select-field">
                  {AWSAccountOptions?.map(resource => (
                    <div className="search-form">
                      <br />
                      <DFSelect
                        options={resource.options.map(el => ({
                          label: el,
                          value: el,
                        }))}
                        name={resource.name}
                        placeholder={`${resource.label}`}
                        onChange={selectedOptions =>
                          this.setAwsSecurityOptions(
                            resource.name,
                            selectedOptions
                          )
                        }
                        value={cloudTrailValue[resource.name]}
                        isMulti
                      />
                    </div>
                  ))}
                  {submitted &&
                    (!awsSecurityAccountFilter['aws_account_id'] ||
                      awsSecurityAccountFilter?.aws_account_id?.length ===
                        0) && (
                      <div
                        className="field-error"
                        style={{
                          marginTop: '10px',
                        }}
                      >
                        AWS Acccount selection is required
                      </div>
                    )}
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
                      options={DURATION_DROPDOWN_COLLECTION.options.map(el => ({
                        value: el.value,
                        label: el.display,
                      }))}
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
            <br />
            <div className="form-group">
              {isDemoModeEnabled
                ? this.getDisabledBtnView()
                : this.getEnabledBtnView()}
            </div>
            <div className="error-msg-container">
              {this.state.isSuccess && (
                <div className="auth-success-msg">
                  {this.state.integrationAddResponse}
                </div>
              )}
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
    const params = {
      dialogTitle: 'Delete Integration?',
      dialogBody:
        'Are you sure you want to delete the AWS security hub integration?',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'No, Keep',
      onConfirmButtonClick: () => this.deleteIntegration(record),
    };
    this.props.dispatch(showModal('DIALOG_MODAL', params));
    this.resetStates();
  }

  getIntegrationTableView() {
    const results = this.props.availableAWSSecurityHubIntegrations.reduce((acc,data) => {
      acc = [...acc, {
        ...data,
        filters: data.filters.aws_account_id,
      }]
      return acc;
    }, [])
    return (
      <IntegrationTableView
        recordCollection={results}
        onDeleteRequestCallback={record => this.handleDeleteDialog(record)}
      />
    );
  }

  getTableEmptyState(data) {
    const emptyStateWrapper = {
      height: '400px',
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
    const { isDemoModeEnabled } = this.state;
    return (
      <div className="empty-state-wrapper">
        {isDemoModeEnabled
          ? FEATURE_BLOCKED_ALERT_MESSAGE.message
          : NO_INTEGRATION_FOUND_ALERT_MESSAGE.message}
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
    const { availableAWSSecurityHubIntegrations } = this.props;
    return (
      <div className="email-integration-view-wrapper">
        <div className="integration-form-section">
          {this.getIntegrationFormView()}
        </div>
        <div className="integration-list-section">
          {this.isDataAvailable(availableAWSSecurityHubIntegrations)
            ? this.getIntegrationTableView()
            : this.getTableEmptyState(availableAWSSecurityHubIntegrations)}
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
    availableAWSSecurityHubIntegrations: state.get('availableAWSSecurityHubIntegrations'),
    licenseResponse: state.get('licenseResponse'),
    nodeFilters: state.getIn(['nodesView', 'topologyFilters', allNodeType]),
  };
}

export default connect(mapStateToProps)(AWSSecurityHubIntegrationView);
