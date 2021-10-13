/* eslint-disable react/destructuring-assignment */
import React from 'react';
import DFSelect from './app';

export default class DFSelectField extends React.PureComponent {
  render() {
    const {
      input,
      meta: {
        touched,
        error,
        warning,
      } = {},
      title,
      rootClassName = 'form-field',
      ...rest
    } = this.props;

    return (
      <div className={rootClassName}>
        <div className="label">
          {title}
        </div>
        <div className="df-select-content df-select-field">
          <DFSelect
            {...input}
            {...rest}
            onBlur={() => this.props.input.onBlur(this.props.input.value)}
          />
          {touched && ((error && <span className="error error-message">{error}</span>) || (warning && <span>{warning}</span>))}
        </div>
      </div>
    );
  }
}
