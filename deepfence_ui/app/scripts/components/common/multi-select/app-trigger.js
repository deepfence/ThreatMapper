/* eslint-disable react/destructuring-assignment */
import React from 'react';
import Select, {components} from 'react-select';

const Input = () => (
  <div />
);

const KebabIcon = () => (
  <div className="icon-kebab-menu" />
);

const Menu = (props) => {
  const {
    alignment,
    children,
  } = props;
  const translateAmount = alignment === 'left' ? '-90%' : '-50%';
  return (
    <div
      className="menu"
      style={{
        transform: `translate(${translateAmount})`,
      }}
    >
      {children}
    </div>
  );
};

const Blanket = props => (
  <div
    style={{
      bottom: 0,
      left: 0,
      top: 0,
      right: 0,
      position: 'fixed',
      zIndex: 1,
    }}
    {...props}
  />
);

const Dropdown = (props) => {
  const {
    children,
    isOpen,
    target,
    toggle,
    menuAlignment,
  } = props;
  return (
    <div className="dropdown">
      <div
        onClick={toggle}
        className="trigger"
        aria-hidden="true"
      >
        {target}
      </div>
      {isOpen ? <Menu alignment={menuAlignment}>{children}</Menu> : null}
      {isOpen ? <Blanket onClick={toggle} /> : null}
    </div>
  );
};

const Option = props => (
  <div>
    <components.Option {...props}>
      <input
        type="checkbox"
        checked={props.isSelected}
        onChange={() => null}
        name={`options-${props.value}`}
        disabled={props.isDisabled}
      />
      <label htmlFor={`options-${props.value}`}>{props.label}</label>
    </components.Option>
  </div>
);

class DFSelectTrigger extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
    };
    this.toggleOpen = this.toggleOpen.bind(this);
    this.handleOnSave = this.handleOnSave.bind(this);
  }

  toggleOpen(e) {
    if (e) {
      e.preventDefault();
    }

    this.setState(state => ({isOpen: !state.isOpen}), () => {
      if (!this.state.isOpen) {
        this.props.onClose();
      }
    });
  }

  // A save button is redundant as the new values are dynamically
  // being passed in the onChange props.
  // Its being provied in use cases where the calling component needs
  // to trigger an API call once the user is done with selecting options.
  handleOnSave() {
    const {
      onSave,
    } = this.props;
    onSave();
    this.toggleOpen();
  }

  render() {
    const {
      options = [],
      triggerIcon = KebabIcon,
      menuAlignment = 'center',
      value,
      minSelectedCount = 0,
      ...rest
    } = this.props;

    const {
      isOpen,
    } = this.state;


    let selectOptions = [
      ...options,
    ];
    if (minSelectedCount) {
      if (value && value.length && value.length === minSelectedCount) {
        const optionValues = value.map(el => el.value);
        selectOptions = options.map(el => ({
          ...el,
          ...(optionValues.includes(el.value) ? {isDisabled: true} : {}),
        }));
      }
    }

    return (
      <div className="df-trigger-select">
        <Dropdown
          isOpen={isOpen}
          toggle={this.toggleOpen}
          target={triggerIcon()}
          menuAlignment={menuAlignment}
        >
          <div
            className="submit"
          >
            <button
              type="button"
              className="primary-btn full-width"
              onClick={this.handleOnSave}
            >
              Save
            </button>
          </div>
          <Select
            components={{
              Control: Input,
              Option,
            }}
            options={selectOptions}
            classNamePrefix="Select"
            searchable={false}
            menuIsOpen
            isMulti
            controlShouldRenderValue={false}
            hideSelectedOptions={false}
            value={value}
            {...rest}
          />
        </Dropdown>
      </div>
    );
  }
}

export default DFSelectTrigger;
