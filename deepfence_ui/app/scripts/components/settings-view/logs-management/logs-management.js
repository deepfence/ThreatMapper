/*eslint-disable*/

// React imports
import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import {
  resetUserProfileStates,
  submitAlertsDeleteRequest,
} from '../../../actions/app-actions';
import DFSelect from '../../common/multi-select/app';

const severityCollection = [
  { name: 'Critical', value: 'critical' },
  { name: 'High', value: 'high' },
  { name: 'Medium', value: 'medium' },
  { name: 'Low', value: 'low' },
  { name: 'All', value: '' },
];

const resourceCollection = [
  {
    name: 'Vulnerabilities',
    value: 'cve',
  },
  {
    name: 'Secrets',
    value: 'secret-scan',
  },
];

const durationOption = [
  { id: 1, display: 'last 1 day', number: '1', time_unit: 'day' },
  { id: 2, display: 'last 7 day', number: '7', time_unit: 'day' },
  { id: 3, display: 'last 30 day', number: '30', time_unit: 'day' },
  { id: 4, display: 'last 60 day', number: '60', time_unit: 'day' },
  { id: 5, display: 'last 90 day', number: '90', time_unit: 'day' },
  { id: 6, display: 'last 180 day', number: '180', time_unit: 'day' },
  { id: 7, display: 'delete all', number: '0', time_unit: 'all' },
];

const VulnerabilityManagementView = props => {
  const [selectedDuration, setSelectedDuration] = useState({
    value: JSON.stringify({
      number: durationOption[0].number,
      time_unit: durationOption[0].time_unit,
    }),
    label: durationOption[0].display,
  });

  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [alertsDeleteResponse, setAlertsDeleteResponse] = useState('');
  const [isSuccess, setIsSuccess] = useState('');
  const [isError, setIsError] = useState('');
  const [docType, setDocType] = useState('');
  const [showSeverityMenu, setShowSeverityMenu] = useState();

  useEffect(() => {
    resetStates();
  }, []);

  useEffect(() => {
    return () => {
      setSelectedSeverity(null);
      setSelectedDuration(null);
      setAlertsDeleteResponse(null);
      setIsSuccess(null);
      setIsError(null);
    };
  }, []);

  useEffect(() => {
    setAlertsDeleteResponse(props.alertsDeleteResponse);
    setIsSuccess(props.isSuccess);
    setIsError(props.isError);
  }, [props.isSuccess && !props.isError]);

  useEffect(() => {
    setAlertsDeleteResponse(props.alertsDeleteResponse);
    setIsSuccess(props.isSuccess);
    setIsError(props.isError);
  }, [!props.isSuccess && props.isError]);

  const resetStates = () => {
    props.dispatch(resetUserProfileStates());
  };

  const handleRadioButtonChange = event => {
    const selectedOption = event.target.value;
    setSelectedSeverity(selectedOption);
  };

  const handleResourceChange = event => {
    const selectedOption = event.target.value;

    setSelectedSeverity('');
    setDocType(selectedOption);
    setShowSeverityMenu(true);
  };

  const handleDropDownChange = selected => {
    setSelectedDuration(selected);
  };

  const handleSeverityDeletionSubmit = () => {
    const duration = JSON.parse(selectedDuration.value);
    let params = {
      number: duration.number,
      severity: selectedSeverity,
      doc_type: docType,
      time_unit: duration.time_unit,
    };
    props.dispatch(submitAlertsDeleteRequest(params));
  };

  const getVulnerabilityManagementView = () => {
    const errorMsgContainer = {
      marginTop: '15px',
    };
    const severityList = severityCollection.map(el => el);
    const durationOptions = durationOption.map(el => ({
      value: JSON.stringify({
        number: el.number,
        time_unit: el.time_unit,
      }),
      label: el.display,
    }));
    return (
      <div className="col-md-8 col-lg-8">
        <div className="alerts-management-settings-pg-bg">
          <div
            className="severity-option-wrapper"
            onChange={() => handleResourceChange(event)}
            style={{ padding: '20px' }}
          >
            <div className="wrapper-heading">Choose Resource</div>
            {resourceCollection.map(option => {
              return (
                <div key={option.value} className="severity-option">
                  <input type="radio" value={option.value} name="docType" id={`delete-severity-doctype-${option.value}`} />
                  <label htmlFor={`delete-severity-doctype-${option.value}`} className="radio-label">
                    {option.name}
                  </label>
                </div>
              );
            })}
          </div>
          {showSeverityMenu && (
            <div
              className="severity-option-wrapper"
              onChange={() => handleRadioButtonChange(event)}
              style={{ paddingTop: '20px' }}
            >
              <div className="wrapper-heading">Choose Severity</div>
              {severityList.map(option => {
                return (
                  <div key={option.value} className="severity-option">
                    <input
                      type="radio"
                      value={option.value}
                      name="severity"
                      checked={option.value === selectedSeverity}
                      id={`delete-severity-${option.value}`}
                    />
                    <label htmlFor={`delete-severity-${option.value}`} className="radio-label">
                      {option.name}
                    </label>
                  </div>
                );
              })}
            </div>
          )}
          <div
            className="duration-wrapper"
            style={{ padding: '20px', display: 'inline' }}
          >
            <div className="wrapper-heading">Choose Duration</div>
            <div className="duration-container df-select-field">
              <DFSelect
                options={durationOptions}
                onChange={(selected) => handleDropDownChange(selected)}
                value={selectedDuration}
                clearable={false}
                simpleValue
              />
            </div>
            <div className="btn-wrapper">
              <div
                className="u-m-btn"
                onClick={() => handleSeverityDeletionSubmit()}
              >
                Delete
              </div>
            </div>
          </div>
        </div>
        <div className="error-msg-container" style={errorMsgContainer}>
          {isError && (
            <div className="auth-error-msg">{alertsDeleteResponse}</div>
          )}
          {isSuccess && (
            <div className="auth-success-msg">{alertsDeleteResponse}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="alerts-management-container" style={{ display: 'inline' }}>
      {getVulnerabilityManagementView()}
    </div>
  );
};

const mapStateToProps = state => ({
  isSideNavCollapsed: state.get('isSideNavCollapsed'),
  alertsDeleteResponse: state.get('alertsDeleteResponse'),
  isError: state.get('isError'),
  isSuccess: state.get('isSuccess'),
});

export default connect(mapStateToProps)(VulnerabilityManagementView);
