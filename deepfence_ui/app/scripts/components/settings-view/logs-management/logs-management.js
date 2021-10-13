/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';
import { resetUserProfileStates, submitAlertsDeleteRequest } from '../../../actions/app-actions';
import DFSelect from '../../common/multi-select/app';

const severityCollection = [
  {name: 'Critical', value: 'critical'}, {name: 'High', value: 'high'},
  {name: 'Medium', value: 'medium'}, {name: 'Low', value: 'low'},
  {name: 'All', value: ''},
];

const resourceCollection = [
  {
    name: 'Vulnerabilities',
    value: 'cve',
  },
];

const durationOption = [
  {id: 1, display: 'last 1 day', number: '1', time_unit: 'day'},
  {id: 2, display: 'last 7 day', number: '7', time_unit: 'day'},
  {id: 3, display: 'last 30 day', number: '30', time_unit: 'day'},
  {id: 4, display: 'last 60 day', number: '60', time_unit: 'day'},
  {id: 5, display: 'last 90 day', number: '90', time_unit: 'day'},
  {id: 6, display: 'last 180 day', number: '180', time_unit: 'day'},
  {id: 7, display: 'delete all', number: '0', time_unit: 'all'}
];

class VulnerabilityManagementView extends React.Component {
  constructor() {
    super();
    this.state = {
      selectedDuration: {
        value: JSON.stringify({
          number: durationOption[0].number,
          time_unit: durationOption[0].time_unit,
        }),
        label: durationOption[0].display,
      },
      selectedSeverity: '',
    };
    this.handleRadioButtonChange = this.handleRadioButtonChange.bind(this);
    this.handleResourceChange = this.handleResourceChange.bind(this);
    this.handleDropDownChange = this.handleDropDownChange.bind(this);
  }

  componentDidMount() {
    this.resetStates();
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    if (newProps.isSuccess && !newProps.isError) {
      this.setState({
        alertsDeleteResponse: newProps.alertsDeleteResponse,
        isSuccess: newProps.isSuccess,
        isError: newProps.isError
      });
    } else if (!newProps.isSuccess && newProps.isError) {
      this.setState({
        alertsDeleteResponse: newProps.alertsDeleteResponse,
        isSuccess: newProps.isSuccess,
        isError: newProps.isError
      });
    }
  }

  componentWillUnmount() {
    this.setState({
      selectedSeverity: undefined,
      selectedDuration: undefined,
      alertsDeleteResponse: undefined,
      isSuccess: undefined,
      isError: undefined
    })
  }

  resetStates() {
    this.props.dispatch(resetUserProfileStates());
  }

  handleRadioButtonChange(event) {
    const selectedOption = event.target.value;
    this.setState({
      selectedSeverity: selectedOption
    });
  }

  handleResourceChange(event) {
    const selectedOption = event.target.value;
    let showSeverityMenu = true;
    if (selectedOption === 'compliance') {
      showSeverityMenu = false;
    }
    this.setState({
      docType: selectedOption,
      showSeverityMenu,
      selectedSeverity: '',
    });
  }

  handleDropDownChange(selected) {
    this.setState({
      selectedDuration: selected,
    });
  }

  handleSeverityDeletionSubmit() {
    const {
      selectedDuration: {
        value: selectedDurationStr,
      } = {},
    } = this.state;
    const duration = JSON.parse(selectedDurationStr);
    let params = {
      number: duration.number,
      severity: this.state.selectedSeverity,
      doc_type: this.state.docType,
      time_unit: duration.time_unit,
    }
    this.props.dispatch(submitAlertsDeleteRequest(params));
  }

  getVulnerabilityManagementView() {
    const errorMsgContainer = {
      marginTop: '15px'
    };
    const {showSeverityMenu, docType, selectedSeverity} = this.state;
    const severityList = severityCollection.map(el => el);
    if (docType === 'alert') {
      severityList.unshift({name: 'Info', value: 'info'});
    }
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
        <div className="severity-option-wrapper"  onChange={this.handleResourceChange} style={{padding: '20px'}}>
            <div className='wrapper-heading'>Choose Resource</div>
            {resourceCollection.map((option)=> {
              return (
                <div key={option.value} className="severity-option">
                  <input
                    type="radio"
                    value={option.value}
                    name='docType'
                  />
                  <label htmlFor={option.name} className='radio-label'>
                    {option.name}
                  </label>
                </div>
              )
            })}
          </div>
          {showSeverityMenu && <div className="severity-option-wrapper"  onChange={this.handleRadioButtonChange} style={{paddingTop: '20px'}}>
            <div className='wrapper-heading'>Choose Severity</div>
            {severityList.map((option)=> {
              return (
                <div key={option.value} className="severity-option">
                  <input
                    type="radio"
                    value={option.value}
                    name='severity'
                    checked={option.value === selectedSeverity}
                  />
                  <label htmlFor={option.name} className='radio-label'>
                    {option.name}
                  </label>
                </div>
              )
            })}
          </div>}
          <div className='duration-wrapper' style={{padding: '20px', display:'inline'}}>
            <div className='wrapper-heading'>Choose Duration</div>
            <div className='duration-container df-select-field'>
              <DFSelect
                options={durationOptions}
                onChange={this.handleDropDownChange}
                value={this.state.selectedDuration}
                clearable={false}
                simpleValue
              />
            </div>
            <div className='btn-wrapper'>
          <div className="u-m-btn" onClick={()=> this.handleSeverityDeletionSubmit()}>Delete</div>
        </div>
          </div>
        </div>
        <div className="error-msg-container" style={errorMsgContainer}>
          {this.state.isError && <div className="auth-error-msg">{this.state.alertsDeleteResponse}</div>}
          {this.state.isSuccess && <div className="auth-success-msg">{this.state.alertsDeleteResponse}</div>}
        </div>
      </div>
    )
  }

  render() {
    return (
      <div className='alerts-management-container' style={{display: 'inline'}}>
        { this.getVulnerabilityManagementView() }
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    isSideNavCollapsed: state.get('isSideNavCollapsed'),
    alertsDeleteResponse: state.get('alertsDeleteResponse'),
    isError: state.get('isError'),
    isSuccess: state.get('isSuccess')
  };
}

export default connect(
  mapStateToProps
)(VulnerabilityManagementView);