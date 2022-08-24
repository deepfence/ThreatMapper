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
];
const allNodeType = 'host,container_image,pod';

class PagerDutyIntegrationView extends React.Component {
  constructor() {
    super();
    this.state = {
      serviceKey: '', // integrationKey
      apiKey: '', // apikey
      severity: '',
      isSuccess: false,
      isError: false,
      duration: '',
      submitted: false,
      filters: [],
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
        'host_name,container_name,image_name_with_tag,user_defined_tags,kubernetes_namespace,kubernetes_cluster_name',
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

    if (newProps.availablePagerDutyIntegrations && newProps.licenseResponse) {
      this.setState({
        availablePagerDutyIntegrations: newProps.availablePagerDutyIntegrations,
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
      serviceKey,
      apiKey,
      severity,
      duration = {},
      resourceType,
      filters,
    } = this.state;

    if (!resourceType) {
      this.setState({
        integrationAddResponse: 'Resource selection in mandatory',
        isError: true,
      });
      return;
    }

    this.setState({
      integrationAddResponse: '',
      isError: false,
    });

    const apiFilters = Object.keys(filters).reduce((acc, key) => {
      acc[key] = filters[key].map(el => el.value);
      return acc;
    }, {});

    if (serviceKey) {
      let params = {
        service_key: serviceKey,
        api_key: apiKey,
        alert_level: severity,
        duration: duration.value,
        integration_type: 'pagerduty',
        notification_type: resourceType.value,
        filters: apiFilters,
      };
      this.props.dispatch(submitIntegrationRequest(params));
    }
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

  getPagerDutyIntegrationFormView() {
    const { serviceKey, apiKey, submitted } = this.state;
    const { showSeverityOptions = false, showDurationOptions = false } =
      this.state;
    const { nodeFilters = [] } = this.props;
    const columnStyle = {
      padding: '0px 60px',
    };
    return (
      <div className="form-wrapper">
        <form name="form">
          <div className="row">
            <div className="col-12 col-md-8">
              <div className="" style={{ columnStyle }}>
                <div className="row">
                  <div className="col">
                    <div
                      className={
                        'form-group' +
                        (submitted && !serviceKey ? ' has-error' : '')
                      }
                    >
                      <label htmlFor="serviceKey">
                        <i className="fa fa-key" aria-hidden="true"></i>
                        <input
                          type="text"
                          className="form-control"
                          name="serviceKey"
                          placeholder="Integration key"
                          value={serviceKey}
                          onChange={this.handleChange}
                        />
                      </label>
                      {submitted && !serviceKey && (
                        <div className="field-error">
                          integration key url is required
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col">
                    <div
                      className={
                        'form-group' +
                        (submitted && !apiKey ? ' has-error' : '')
                      }
                    >
                      <label htmlFor="apiKey">
                        <i className="fa fa-key" aria-hidden="true"></i>
                        <input
                          type="text"
                          className="form-control"
                          name="apiKey"
                          placeholder="API key"
                          value={apiKey}
                          onChange={this.handleChange}
                        />
                      </label>
                      {submitted && !apiKey && (
                        <div className="field-error">API key is required</div>
                      )}
                    </div>
                  </div>
                </div>
                {/* <div className="form-group" style={{marginTop: '60px'}}>
            { this.getEnabledBtnView() }
          </div> */}
                <div
                  className="severity-option-wrapper"
                  onChange={this.handleResourceChange}
                >
                  <div className="wrapper-heading">Choose Resource</div>
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
                <div>
                  <AdvanceFilterOption
                    modalContent={this.getModalContent}
                    filters={this.props.nodeFilters}
                  />
                </div>
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
      dialogBody: 'Are you sure you want to delete the Pager Duty integration?',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'No, Keep',
      onConfirmButtonClick: () => this.deleteIntegration(record),
    };
    this.props.dispatch(showModal('DIALOG_MODAL', params));
    this.resetStates();
  }

  getIntegrationTableView() {
    return (
      <IntegrationTableView
        recordCollection={this.props.availablePagerDutyIntegrations}
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
    const { availablePagerDutyIntegrations } = this.props;
    return (
      <div className="pager-duty-integration-view-wrapper">
        <div className="integration-form-section">
          {this.getPagerDutyIntegrationFormView()}
        </div>
        <div className="integration-list-section">
          {this.isDataAvailable(availablePagerDutyIntegrations)
            ? this.getIntegrationTableView()
            : this.getTableEmptyState(availablePagerDutyIntegrations)}
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
    availablePagerDutyIntegrations: state.get('availablePagerDutyIntegrations'),
    licenseResponse: state.get('licenseResponse'),
    nodeFilters: state.getIn(['nodesView', 'topologyFilters', allNodeType]),
  };
}

export default connect(mapStateToProps)(PagerDutyIntegrationView);
