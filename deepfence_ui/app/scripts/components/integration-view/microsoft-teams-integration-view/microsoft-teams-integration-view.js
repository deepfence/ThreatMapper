import React from 'react';
import { connect } from 'react-redux';

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
import { NO_INTEGRATION_FOUND_ALERT_MESSAGE } from '../../../constants/visualization-config';
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

class MicrosoftIntegrationView extends React.Component {
  constructor() {
    super();
    this.state = {
      webHookUrl: '',
      severity: '',
      isSuccess: false,
      isError: false,
      duration: '',
      submitted: false,
      filters: {},
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

    if (
      newProps.availableMicrosoftTeamsIntegrations &&
      newProps.licenseResponse
    ) {
      this.setState({
        // eslint-disable-next-line react/no-unused-state
        availableMicrosoftTeamsIntegrations:
          newProps.availableMicrosoftTeamsIntegrations,
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
    const showSeverityOptions = false;
    const showDurationOptions = false;
    const duration = 0;
    this.setState({
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

    if (webHookUrl) {
      const params = {
        webhook_url: webHookUrl,
        alert_level: severity,
        duration: duration.value,
        integration_type: 'microsoft_teams',
        notification_type: resourceType.value,
        filters: apiFilters,
      };
      this.props.dispatch(submitIntegrationRequest(params));
    }
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

  getMicrosoftTeamsIntegrationFormView() {
    const { webHookUrl, submitted } = this.state;
    const { showSeverityOptions = false, showDurationOptions = false } =
      this.state;
    const columnStyle = {
      padding: '0px 60px',
    };
    return (
      <div className="form-wrapper">
        <form name="form">
          <div className="row">
            <div className="col-12 col-md-8">
              <div className="" style={{ columnStyle }}>
                <div
                  className={`form-group${
                    submitted && !webHookUrl ? ' has-error' : ''
                  }`}
                >
                  <label htmlFor="webHookUrl">
                    <i className="fa fa-link" aria-hidden="true" />
                    <input
                      type="text"
                      className="form-control"
                      name="webHookUrl"
                      placeholder="Microsoft Teams Webhook Url"
                      value={webHookUrl}
                      onChange={this.handleChange}
                    />
                    <span className="help-text">
                      Ex.
                      https://myteam.webhook.office.com/webhookb2/a1b1c1d1/XXX/XXXX
                    </span>
                  </label>
                  {submitted && !webHookUrl && (
                    <div className="field-error">Webhook url is required</div>
                  )}
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
                  {showDurationOptions && (
                    <div className="col-md-6">
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
                    </div>
                  )}
                </div>
                <div className="error-msg-container">
                  {this.state.isError && (
                    <div className="auth-error-msg">
                      {this.state.integrationAddResponse}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <AdvanceFilterOption
                  modalContent={this.getModalContent}
                  filters={this.props.nodeFilters}
                />
              </div>
              <br />
              <div className="form-group">
                <button
                  type="button"
                  className="app-btn"
                  onClick={this.handleSubmit}
                >
                  Subscribe
                </button>
              </div>
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
    const params = {
      id: record.id,
      notification_type: record.notification_type,
    };
    return this.props.dispatch(requestIntegrationDelete(params));
  }

  handleDeleteDialog(record) {
    this.resetStates();
    const params = {
      dialogTitle: 'Delete Integration?',
      dialogBody:
        'Are you sure you want to delete the Microsoft Teams integration?',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'No, Keep',
      onConfirmButtonClick: () => this.deleteIntegration(record),
    };
    this.props.dispatch(showModal('DIALOG_MODAL', params));
  }

  render() {
    const { availableMicrosoftTeamsIntegrations: data } = this.props;
    return (
      <div className="email-integration-view-wrapper">
        <div className="integration-form-section">
          {this.getMicrosoftTeamsIntegrationFormView()}
        </div>
        <div
          className="integration-list-section"
          style={{ marginLeft: '-6px' }}
        >
          {data?.length > 0 ? (
            <IntegrationTableView
              recordCollection={data}
              onDeleteRequestCallback={record =>
                this.handleDeleteDialog(record)
              }
            />
          ) : (
            <EmptyTableState />
          )}
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
    availableMicrosoftTeamsIntegrations: state.get(
      'availableMicrosoftTeamsIntegrations'
    ),
    licenseResponse: state.get('licenseResponse'),
    nodeFilters: state.getIn(['nodesView', 'topologyFilters', allNodeType]),
  };
}

export default connect(mapStateToProps)(MicrosoftIntegrationView);

const EmptyTableState = () => {
  const emptyStateWrapper = {
    height: '400px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  return (
    <div style={emptyStateWrapper}>
      <div className="empty-state-wrapper">
        {NO_INTEGRATION_FOUND_ALERT_MESSAGE.message}
      </div>
    </div>
  );
};
