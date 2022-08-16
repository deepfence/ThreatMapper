/* eslint-disable prefer-destructuring */
/* eslint-disable react/destructuring-assignment */
import React, { useRef } from 'react';
import Select from 'react-select';
import { List } from 'react-virtualized';
import useClickAway from 'react-use/lib/useClickAway';
import Portal from "@reach/portal";

const Menu = props => {
  const ref = useRef(null);
  useClickAway(ref, () => {
    props?.onClose?.();
  });
  const shadow = 'hsla(218, 50%, 10%, 0.1)';
  const {
    maxOptionCharLength,
    dropdownExpandDirection = 'right',
    targetRef,
    ...rest
  } = props;
  const targetClientRect = targetRef?.current?.getBoundingClientRect?.();
  let expansionDirection = 'left';
  if (dropdownExpandDirection === 'right') {
    expansionDirection = 'left';
  } else if (dropdownExpandDirection === 'left') {
    expansionDirection = 'right';
  }
  // Make sure width doesn't cross more than 300%
  const maxSupportedCharLength = Math.min(75, maxOptionCharLength);
  const MenuStyle = {
    borderRadius: 4,
    boxShadow: `0 0 0 1px ${shadow}, 0 4px 11px ${shadow}`,
    marginTop: 8,
    position: 'absolute',
    zIndex: 101,
    // provide 4 times the char length which covers the worst case
    // where all characters are 'm' in small case. (character 'm'
    // takes the most pixel width in the current font family @ 14px size)
    // Make sure the width doesn't fall below 100%
    width: `${Math.max(targetClientRect?.width ?? 0, maxSupportedCharLength * 10)}px`,
    maxWidth: '400px',
    top: 8 + (targetClientRect?.y ?? 0) + (window.scrollY ?? 0) + (targetClientRect?.height ?? 0),
    [`${expansionDirection}`]: expansionDirection === 'left' ? (targetClientRect?.x ?? 0) : `calc(100vw - ${(targetClientRect?.right ?? 0)}px)`,
  };

  return (
    <div
      ref={ref}
      className="df-select"
      style={MenuStyle}
      {...rest}
    />
  );
};
const Dropdown = ({
  children,
  isOpen,
  target,
  onClose,
  maxOptionCharLength,
  dropdownExpandDirection,
}) => {
  const targetRef = useRef(null);
  return (
    <div style={{ position: 'relative' }}>
      <span ref={targetRef}>
        {target}
      </span>
      {isOpen ? (
        <Portal>
          <Menu
            maxOptionCharLength={maxOptionCharLength}
            dropdownExpandDirection={dropdownExpandDirection}
            onClose={onClose}
            targetRef={targetRef}
          >
            {children}
          </Menu>
        </Portal>
      ) : null}
    </div>
  );
};

const Svg = p => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    focusable="false"
    role="presentation"
    {...p}
  />
);
const DropdownIndicator = () => (
  <div css={{ color: 'red', height: 24, width: 32 }}>
    <Svg>
      <path
        d="M16.436 15.085l3.94 4.01a1 1 0 0 1-1.425 1.402l-3.938-4.006a7.5 7.5 0 1 1 1.423-1.406zM10.5 16a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </Svg>
  </div>
);

const selectStyles = {
  control: provided => ({ ...provided, margin: 8 }),
  menu: () => ({ boxShadow: 'inset 0 1px 0 rgba(0, 0, 0, 0.1)' }),
};

const VirtualizedList = props => {
  const rows = props.children;
  const rowRenderer = ({ key, index, style }) => (
    <div key={key} style={style}>
      {rows[index]}
    </div>
  );

  return (
    <List
      style={{ width: '100%' }}
      width={750}
      height={300}
      rowHeight={30}
      rowCount={rows.length || 0}
      rowRenderer={rowRenderer}
    />
  );
};

const filterOption = (candidate, input = '') => {
  if (input.length === 0) {
    return true;
  }
  const { label = '' } = candidate;
  return label.toLowerCase().includes(input.toLowerCase());
};

class DFSearchableSelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.onSelectChange = this.onSelectChange.bind(this);
    this.toggleOpen = this.toggleOpen.bind(this);
    this.handleClearAll = this.handleClearAll.bind(this);
    this.handleSelectAll = this.handleSelectAll.bind(this);
  }

  toggleOpen(e) {
    if (e) {
      e.preventDefault();
    }
    this.setState(state => ({ isOpen: !state.isOpen }));
  }

  handleClearAll() {
    const { onChange = () => {}, isMulti } = this.props;

    if (isMulti) {
      onChange([]);
    } else {
      onChange({});
    }
  }

  handleSelectAll() {
    const { onChange = () => {}, options } = this.props;

    onChange(options);
  }

  onSelectChange(controlValue) {
    const { isMulti, onChange = () => {} } = this.props;
    if (!isMulti) {
      this.toggleOpen();
    }
    onChange(controlValue);
  }

  render() {
    const {
      options,
      name,
      placeholder,
      isMulti,
      buttonLabel,
      value,
      onChange,
      dropdownExpandDirection = 'right',
      ...rest
    } = this.props;
    const { isOpen } = this.state;
    let passedValue = value;
    if (!isMulti && Array.isArray(value) && value.length > 0) {
      passedValue = value[0];
    }
    const userValue = passedValue;
    let buttonValue =
      userValue && userValue.value !== undefined
        ? userValue.label
        : buttonLabel;
    if (isMulti) {
      buttonValue =
        userValue && userValue.length
          ? `${buttonLabel} (${userValue.length})`
          : `${buttonLabel}`;
    }

    const maxOptionCharLength = options
      .map(el => el.label)
      .reduce(
        (acc, label) => (acc.length > label.length ? acc : label),
        ''
      ).length;

    return (
      <Dropdown
        isOpen={isOpen}
        maxOptionCharLength={maxOptionCharLength}
        dropdownExpandDirection={dropdownExpandDirection}
        onClose={this.toggleOpen}
        target={
          <button
            className="primary-btn non-focus select-button-wrapper"
            onClick={this.toggleOpen}
            aria-hidden="true"
            type='button'
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>{buttonValue}</div>
              <div
                style={{ lineHeight: 'unset' }}
                className="fa fa-chevron-down"
              />
            </div>
          </button>
        }
      >
        <Select
          components={{
            DropdownIndicator,
            IndicatorSeparator: null,
            // if there are more than 50 opitons, switch to Virtualized list
            ...(options && options.length > 50
              ? { MenuList: VirtualizedList }
              : {}),
          }}
          backspaceRemovesValue={false}
          controlShouldRenderValue={false}
          hideSelectedOptions={false}
          isClearable={false}
          classNamePrefix="Select"
          isSearchable
          menuIsOpen
          onChange={this.onSelectChange}
          tabSelectsValue={false}
          value={userValue}
          options={options}
          placeholder={placeholder}
          styles={selectStyles}
          isMulti={isMulti}
          filterOption={filterOption}
          onKeyDown={e => {
            if (e.keyCode === 13) {
              // prevent default on enter key press
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          {...rest}
        />
        {isMulti && (
          <div className="Select__options-menu">
            <div
              onClick={this.handleSelectAll}
              className="Select__options-menu-item"
              aria-hidden="true"
            >
              Select All
            </div>
            <div
              onClick={this.handleClearAll}
              className="Select__options-menu-item"
              aria-hidden="true"
            >
              Clear All
            </div>
          </div>
        )}
      </Dropdown>
    );
  }
}
export default DFSearchableSelect;
