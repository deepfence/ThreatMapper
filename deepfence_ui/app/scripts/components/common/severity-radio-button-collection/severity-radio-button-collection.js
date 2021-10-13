/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';
import {ALERT_TYPE_RADIO_BUTTON_COLLECTION} from "../../../constants/dropdown-option-collection";
import DFSelect from '..//multi-select/app';

class SeverityDropdownView extends React.Component {
  constructor() {
    super();
    this.state = {};
    this.handleDropdownChange = this.handleDropdownChange.bind(this);
  }

  componentWillUnmount() {
    this.setState({
      selectedSeverity: undefined
    })
  }

  handleDropdownChange(event) {
    const selectedOption = event.value;
    this.setState({
      selectedSeverity: selectedOption
    });
    this.props.onDropdownCheckedCallback(selectedOption);
  }  

  render() {
    return (
      <div className="severity-option-wrapper" onChange={this.handleDropdownChange}>
        <div className='wrapper-heading'>{ this.props.heading }</div>
        <div className='df-select-field'>
          <DFSelect
            options={ALERT_TYPE_RADIO_BUTTON_COLLECTION.options.map(option => ({value: option.value, label: option.name}))}
            onChange={this.handleDropdownChange}
            placeholder= 'Severity'
            clearable={false}
          />
        </div>

      </div>
    );
  }
}

function mapStateToProps(state) {
  return { };
}

export default connect(
  mapStateToProps
)(SeverityDropdownView);
