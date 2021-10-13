import React from 'react';
import ToggleSwitch from './index';

export default class ToggleSwitchField extends React.PureComponent {
  render() {
    const {
      input,
      ...rest
    } = this.props;

    return (
      <div className="form-field">
        <ToggleSwitch
          input={input}
          {...rest}
        />
      </div>
    );
  }
}
