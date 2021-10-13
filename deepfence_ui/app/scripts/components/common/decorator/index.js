import React from 'react';
import classnames from 'classnames';

const DECORATE_CAPITALIZE = {
  capitalize: true
};

const DECORATE_UPPERCASE = {
  uppercase: true,
};

const DECORATE_LOWERCASE = {
  lowercase: true,
};

// Decorates the give text with a span HTML element and adds
// tooltip (HTML title attr) by default
// Additional text transforms like capitalize, uppercase and
// lowercase can be configured
export function decorateWith(innerText, {
  tooltip = true,
  capitalize = false,
  uppercase = false,
  lowercase = false,
} = {}) {
  const className = classnames({
    'capitalize-text': capitalize,
    'uppercase-text': uppercase,
    'lowercase-text': lowercase,
  });
  return (
    <span className={className} title={tooltip ? innerText : false}>
      {innerText}
    </span>
  );
}

export function decorateWithCapitalize(innerText) {
  return decorateWith(innerText, DECORATE_CAPITALIZE);
}

export function decorateWithUpperCase(innerText) {
  return decorateWith(innerText, DECORATE_UPPERCASE);
}

export function decorateWithLowercase(innerText) {
  return decorateWith(innerText, DECORATE_LOWERCASE);
}
