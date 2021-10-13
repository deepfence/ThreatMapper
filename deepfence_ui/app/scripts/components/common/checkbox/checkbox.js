/*eslint-disable*/

// React imports
import React from 'react';

import {
  CRITICAL_SEVERITY, CRITICAL_SEVERITY_CHECKBOX, HIGH_SEVERITY, HIGH_SEVERITY_CHECKBOX,
  LOW_SEVERITY, LOW_SEVERITY_CHECKBOX, MEDIUM_SEVERITY, MEDIUM_SEVERITY_CHECKBOX, NETWORK_ANOMALY,
  NETWORK_ANOMALY_CHECKBOX, BEHAVIORAL_ANOMALY, BEHAVIORAL_ANOMALY_CHECKBOX, SYSTEM_AUDIT,
  SYSTEM_AUDIT_ANOMALY_CHECKBOX, SYSCALL_ANOMALY, SYSCALL_ANOMALY_CHECKBOX
} from "../../../constants/naming";
import {getLabelColour} from "../../../utils/color-utils";

class CheckBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isChecked: this.props.checkboxDetails.isChecked
    };
    this.toggleCheckboxChange = this.toggleCheckboxChange.bind(this);
  }

  toggleCheckboxChange(value, dropdownType) {
    let obj = {};
    obj[dropdownType] = value;
    if (this.state.isChecked){
      this.setState({isChecked: false});
    } else {
      this.setState({isChecked: true});
    }
    this.props.onCheckboxCheckedCallback(obj);
  }

  render() {
    const checkBoxValue = this.props.checkboxDetails.value;
    const checkBoxLabel = this.props.checkboxDetails.name;
    const dropDownType = this.props.dropDpwnType;
    return (
      <div className={"checkbox-wrapper " + getLabelColour(checkBoxValue)}>
        <label className="label">{checkBoxLabel}</label>
        <input
          type="checkbox"
          value={checkBoxValue}
          checked={this.state.isChecked}
          onChange={() => this.toggleCheckboxChange(checkBoxValue, dropDownType)}
          />
      </div>
    );
  }
}

export default CheckBox;
