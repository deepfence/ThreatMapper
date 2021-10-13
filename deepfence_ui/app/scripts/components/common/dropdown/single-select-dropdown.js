import React from 'react';
import Select from 'react-select';
import './styles.scss';

export const SingleSelectDropdown = (props) => {
  const styles = {
    option: (provided, state) => ({
      ...provided,
      color: state.isSelected ? '#0080ff' : '#999999',
      backgroundColor: state.isSelected ? '#1c1c1c' : provided.backgroundColor,
      '&:hover': {
        backgroundColor: '#333333'
      }
    }),
    control: provided => ({
      ...provided,
      width: props.width,
      borderColor: '#1c1c1c',
    }),
  };

  const themeCb = theme => ({
    ...theme,
    borderRadius: 5,
    colors: {
      ...theme.colors,
      primary25: '#1c1c1c', // hover
      neutral20: '#c0c0c0', // border
      primary: '#000',
      neutral0: '#1c1c1c', // '#22252b', // background
      neutral80: '#bfbfbf', // placeholder
      neutral90: 'white'
    }
  });

  return (
    <div className="single-select-dropdown">
      <span className="prefix-text-dropdown">{props.prefixText}</span>
      <Select
        {...props}
        components={{
          IndicatorSeparator: null,
        }}
        onChange={value => props.onChange(value)}
        styles={styles}
        theme={themeCb}
      />
      <span className="postfix-text-dropdown">{props.postfixText}</span>
    </div>
  );
};
