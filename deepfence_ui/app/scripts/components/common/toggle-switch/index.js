import React from 'react';

export default class ToggleSwitch extends React.PureComponent {
  constructor(props) {
    super(props);
    this.toggle = this.toggle.bind(this);
  }

  toggle() {
    const {input: {onChange, value}} = this.props;
    onChange(!value);
  }

  render() {
    const {label, input} = this.props;
    return (
      <div className="toggle-switch" onClick={this.toggle} aria-hidden="true">
        <div className="toggle-switch-container">
          <input
            {...input}
            type="checkbox"
            checked={input.value}
          />
          <span className="slyder" />
        </div>
        {label
          && (
          <div className="label">
            {' '}
            {label}
            {' '}
          </div>
          )
        }
      </div>
    );
  }
}
