/* eslint-disable max-len */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/no-unused-state */
import React from 'react';
import { connect } from 'react-redux';
// Custom component imports
import { differenceWith } from 'lodash';
import SeverityDropdownView from '../components/common/severity-radio-button-collection/severity-radio-button-collection';
import DFSelect from '../components/common/multi-select/app';
import {
  resetIntegrationStates,
  submitIntegrationRequest,
  enumerateFiltersAction,
} from '../actions/app-actions';
import { getIntegrations } from '../utils/web-api-utils';
// import {SEVERITY_RADIO_BUTTON_COLLECTION_HEADING} from '../constants/naming';
import {
  DURATION_DROPDOWN_COLLECTION,
  NOTIFICATION_RESOURCE_OPTIONS,
  NOTIFICATION_RESOURCE_OPTIONS_CLOUDTRAIL
} from '../constants/dropdown-option-collection';
import AdvanceFilterOption, {
  AdvancedFilterModalContent,
} from '../components/integration-view/advance-filter-modal';

const allNodeType = 'host,container_image,pod,aws';

const withIntegrationForm = (WrappedComponent, ingoreResources) => {
  class HOC extends React.PureComponent {
    constructor(props) {
      super(props);
      this.handleRadioButtonState = this.handleRadioButtonState.bind(this);
      this.handleDurationDropDownState =
        this.handleDurationDropDownState.bind(this);
      this.handleResourceChange = this.handleResourceChange.bind(this);
      this.handleSubmit = this.handleSubmit.bind(this);
      this.saveChildFormData = this.saveChildFormData.bind(this);
      this.getFilters = this.getFilters.bind(this);
      this.getModalContent = this.getModalContent.bind(this);
      this.seCloudtrailOptions = this.seCloudtrailOptions.bind(this);
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
          'host_name,container_name,image_name_with_tag,user_defined_tags,kubernetes_namespace,kubernetes_cluster_name,cloudtrail_trail,severity',
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
    }

    componentWillUnmount() {
      this.setState({
        isSuccess: false,
        isError: false,
      });
    }

    getEnabledBtnView() {
      return (
        <button type="button" className="app-btn" onClick={this.handleSubmit}>
          Subscribe
        </button>
      );
    }

    handleSubmit(e) {
      e.preventDefault();
      this.setState({ submitted: true });
      const {
        childPayload = {},
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

      // KLUDGE: Below is the bad way of doing form validation
      // TODO: Implement better approach
      const childValues = Object.keys(childPayload).map(
        key => childPayload[key]
      );
      const filledValues = childValues.filter(el => el);

      let childFormComplete =
        childValues.length !== 0 && childValues.length === filledValues.length;

      // TODO: It's a hack
      // for intergration_type: jira
      // with password state has 2 extra variables empty/false(isAuthToken and authToken)
      // with auth-token state has 1 extra variable empty/false(password)
      // there is one optional field(assignee)
      if (childPayload.integration_type === 'jira') {
        if (childPayload.isAuthToken) {
          childFormComplete =
            childValues.length !== 0 &&
            [childValues.length - 1, childValues.length - 2].includes(filledValues.length);
        } else {
          childFormComplete =
            childValues.length !== 0 &&
            [childValues.length - 3, childValues.length - 2].includes(filledValues.length);
        }
      }
      if (
        childPayload.integration_type === 'http_endpoint' ||
        childPayload.integration_type === 'google_chronicle'
      ) {
        if (!childPayload.authorizationKey) {
          childFormComplete =
            childValues.length !== 0 &&
            childValues.length - 2 === filledValues.length;
        }
      }

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

      if (childFormComplete) {
        const params = {
          ...childPayload,
          alert_level: severity,
          duration: duration.value,
          notification_type: resourceType.value,
          filters: filterObject,
        };
        this.props.dispatch(submitIntegrationRequest(params));
      }
    }

    resetStates() {
      this.props.dispatch(resetIntegrationStates());
    }

    fetchIntegrationList() {
      getIntegrations(this.props.dispatch);
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
      if (selectedOption.value === 'alert') {
        showSeverityOptions = true;
        showDurationOptions = true;
        duration = '';
      } else if (selectedOption.value === 'policy_logs') {
        showDurationOptions = true;
        duration = '';
      } else if (selectedOption.value === 'user_activity') {
        showDurationOptions = true;
        duration = '';
      }
      this.setState({
        docType: selectedOption,
        showSeverityOptions,
        showDurationOptions,
        resourceType: selectedOption,
        severity: '',
        duration,
      });
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
          // eslint-disable-next-line react/no-access-state-in-setstate
          ...this.state.cloudTrailValue,
          cloudtrail_trail: value,
        },
      });
    }

    renderIntegrationForm() {
      const {
        showSeverityOptions = false,
        showDurationOptions = false,
        resourceType,
        childPayload,
        cloudTrailValue,
      } = this.state;
      const columnStyle = {
        padding: '0px 60px',
      };
      const { integrationName } = this.props;
      const integrationNameCheck = integrationName.split('/ ');
      const cloudtrailCheck =
        integrationNameCheck &&
        (integrationNameCheck[1] === 'Jira' ||
          integrationNameCheck[1] === 'S3');

      let notificationOptionsCheck = [];

      if (
        integrationNameCheck &&
        (integrationNameCheck[1] === 'Jira' || integrationNameCheck[1] === 'S3')
      ) {
        notificationOptionsCheck = NOTIFICATION_RESOURCE_OPTIONS;
      } else {
        notificationOptionsCheck = NOTIFICATION_RESOURCE_OPTIONS_CLOUDTRAIL;
        if (ingoreResources && ingoreResources.length) {
          notificationOptionsCheck = differenceWith(
            NOTIFICATION_RESOURCE_OPTIONS_CLOUDTRAIL, 
            ingoreResources, 
            ({ value }, id) => id === value
          );
        }
      }

      const cloudTrailOptions =
        this.props.nodeFilters &&
        // eslint-disable-next-line array-callback-return
        this.props.nodeFilters.filter(item => {
          if (item.label === 'CloudTrail') return item;
        });
      return (
        <div className="">
          <div className="row">
            <div className="col-12 col-md-12">
              <div
                className="severity-option-wrapper"
                onChange={this.handleResourceChange}
              >
                <div className="wrapper-heading">Choose Resource*</div>
                <div className="resource-option-wrapper">
                  <div className="df-select-field">
                    <DFSelect
                      options={notificationOptionsCheck.map(el => ({
                        value: el.value,
                        label: el.label,
                      }))}
                      onChange={this.handleResourceChange}
                      placeholder="Resources"
                      value={this.state.resourceType}
                      clearable={false}
                    />
                  </div>
                </div>
              </div>
              {!cloudtrailCheck &&
                resourceType &&
                resourceType.value === 'cloudtrail_alert' && (
                  <div className="row">
                    <div className="col">
                      <div
                        className="form-group df-select-field"
                        style={{ width: '250px' }}
                      >
                        {cloudTrailOptions.map(filter => (
                          <div className="search-form" key={filter.name}>
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
              {(showSeverityOptions || showDurationOptions) && (
                <div className="row">
                  {showSeverityOptions && (
                    <div className="col-md-4">
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
                    <div className="col-md-4">
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
              )}
              <div className="error-msg-container">
                {this.state.isError && (
                  <div className="auth-error-msg">
                    {this.state.integrationAddResponse}
                  </div>
                )}
              </div>
              <br />
              {!cloudtrailCheck &&
                resourceType &&
                resourceType.value !== 'cloudtrail_alert' && (
                  <div>
                    <AdvanceFilterOption
                      modalContent={this.getModalContent}
                      filters={this.props.nodeFilters}
                    />
                  </div>
                )}
              <br />
              <div className="form-group">{this.getEnabledBtnView()}</div>
            </div>
            <div className="col-12 col-md-4">
              <div className="" style={columnStyle}>
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
        </div>
      );
    }

    saveChildFormData(childPayload) {
      this.setState({
        childPayload,
      });
    }

    render() {
      const { submitted } = this.state;
      return (
        <div className="integration-form-section">
          <div className="form-wrapper">
            <form name="form" autoComplete="off">
              <input
                style={{ opacity: 0, position: 'absolute' }}
                autoComplete="off"
              />
              <WrappedComponent
                saveChildFormData={this.saveChildFormData}
                submitted={submitted}
                {...this.props}
              />
              {this.renderIntegrationForm()}
            </form>
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
      licenseResponse: state.get('licenseResponse'),
      nodeFilters: state.getIn(['nodesView', 'topologyFilters', allNodeType]),
      integrationName: state.get('integrationName'),
    };
  }

  const connectedHOC = connect(mapStateToProps)(HOC);

  return connectedHOC;
};

export default withIntegrationForm;
