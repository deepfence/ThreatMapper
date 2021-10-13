/* eslint-disable react/button-has-type */
import React, { useState } from 'react';
import OutsideClickHandler from 'react-outside-click-handler';

/* drop down menu that opens up on a clickable button */
export const DfDropDownMenu = (
  {
    selectedObjectIndex, triggerModal, options = [], alignment = 'left', label = '', disabled, dispatch,
  }
) => {
  const [showOptions, setShowOptions] = useState(false);

  const handleOptionClick = (option) => {
    option.onClick(selectedObjectIndex, triggerModal, dispatch);
    setShowOptions(false);
  };

  return (
    <>
      <OutsideClickHandler onOutsideClick={() => setShowOptions(false)}>
        <div className="extra-options">
          <button
            className='primary-btn'
            disabled={disabled}
            style={{ minWidth: '50px' }}
            onClick={() => setShowOptions(value => !value)}
          >
            {label}
          </button>
          <div className="df-dropdown-menu">

            {showOptions && (
              <div className={`df-dropdown-menu-content align-${alignment}`}>
                {options.map(option => (
                  <li
                    key={option.label}
                    onClick={option.enabled ? () => handleOptionClick(option) : () => { }}
                    aria-hidden="true"
                    style={!option.enabled ? { cursor: 'not-allowed', color: '#696869' } : {}}
                  >
                    {option.label}
                  </li>
                ))}
              </div>
            )}

          </div>
        </div>
      </OutsideClickHandler>
    </>
  );
};
