/* eslint-disable react/destructuring-assignment */
import React from 'react';
import Select from 'react-select';

class DFSelect extends React.PureComponent {
  constructor(props) {
    super(props);
    this.handleOnChange = this.handleOnChange.bind(this);
  }

  handleOnChange(selectedOption) {
    this.props.onChange(selectedOption);
  }

  render() {
    const {
      value, options, placeholder, ...rest
    } = this.props;
    return (
      <Select
        value={value}
        classNamePrefix="Select"
        onChange={this.handleOnChange}
        options={options && options.toJS ? options.toJS() : options}
        placeholder={placeholder}
        isSearchable={false}
        components={{ IndicatorSeparator: () => null }}
        {...rest}
      />
    );
  }
}


export default DFSelect;
