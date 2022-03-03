import React from 'react';
import filesize from 'filesize';
import { format as d3Format } from 'd3-format';
import moment from 'moment';
import { isEmpty } from 'lodash';

const formatLargeValue = d3Format('s');

function renderHtml(text, unit) {
  return (
    <span className="metric-formatted">
      <span className="metric-value">{text}</span>
      <span className="metric-unit">{unit}</span>
    </span>
  );
}

function padToThreeDigits(n) {
  return `000${n}`.slice(-3);
}

function makeFormatters(renderFn) {
  const formatters = {
    filesize(value) {
      const obj = filesize(value, { output: 'object', round: 1 });
      return renderFn(obj.value, obj.suffix);
    },

    integer(value) {
      const intNumber = Number(value).toFixed(0);
      if (value < 1100 && value >= 0) {
        return intNumber;
      }
      return formatLargeValue(intNumber);
    },

    number(value) {
      if (value < 1100 && value >= 0) {
        return Number(value).toFixed(2);
      }
      return formatLargeValue(value);
    },

    percent(value) {
      return renderFn(formatters.number(value), '%');
    },
  };

  return formatters;
}

function makeFormatMetric(renderFn) {
  const formatters = makeFormatters(renderFn);
  return (value, opts) => {
    const formatter = opts && formatters[opts.format] ? opts.format : 'number';
    return formatters[formatter](value);
  };
}

export const formatMetric = makeFormatMetric(renderHtml);

const CLEAN_LABEL_REGEX = /[^A-Za-z0-9]/g;
export function slugify(label) {
  return label.replace(CLEAN_LABEL_REGEX, '').toLowerCase();
}

// Converts IPs from '10.244.253.4' to '010.244.253.004' format.
export function ipToPaddedString(value) {
  return value.match(/\d+/g).map(padToThreeDigits).join('.');
}

// Formats metadata values. Add a key to the `formatters` obj
// that matches the `dataType` of the field. You must return an Object
// with the keys `value` and `title` defined.
// `referenceTimestamp` is the timestamp we've time-travelled to.
export function formatDataType(field, referenceTimestampStr = null) {
  const formatters = {
    datetime(timestampString) {
      const timestamp = moment(timestampString);
      const referenceTimestamp = referenceTimestampStr
        ? moment(referenceTimestampStr)
        : moment();
      return {
        value: timestamp.from(referenceTimestamp),
        title: timestamp.utc().toISOString(),
      };
    },
  };
  const format = formatters[field.dataType];
  return format
    ? format(field.value)
    : { value: field.value, title: field.value };
}

export function removeUnderscore(label) {
  let result = '';
  if (label !== undefined || label !== null) {
    if (label === 'alerts_&_logs_management') {
      result = 'vulnerability & secret management'
    } else {
      result = label.split('_').join(' ');
    }
  } else {
    result = label;
  }
  return result;
}

export function zeroPad(number) {
  return number < 10 ? `0${number}` : number;
}

export function getHostNameWithoutSemicolon(string) {
  if (!isEmpty(string)) {
    return string.split(';')[0];
  }
  return '';
}

export function withTimeUnits(value, baseUnit = '') {
  let durationValue;
  let unit = '';
  const duration = moment.duration(value, baseUnit);
  if (value < 60) {
    durationValue = duration.asSeconds();
    unit = 'secs';
  } else if (value >= 60 && value < 3600) {
    durationValue = duration.asMinutes();
    unit = 'mins';
  } else if (value >= 3600 && value < 9999) {
    durationValue = duration.asHours();
    unit = 'hours';
  } else if (value >= 9999) {
    durationValue = duration.asDays();
    unit = 'days';
  }
  if (durationValue % 1 !== 0) {
    durationValue = durationValue.toFixed(2);
  }
  const formatStr = `${durationValue} ${unit}`;
  return formatStr;
}

// There methods were defined to be used for redux-form field names
// with a dot. redux-form converts the field names with dots to nested
// objects.
// The below method replaces dot with a unique value which has very less
// probablity of being present in the data string.
const DF_KEYWORD = 'D__DF__F';
export function replaceWithDFKeyword(baseStr, keyword) {
  if (typeof baseStr !== 'string') {
    return;
  }

  const condition = new RegExp(`\\${keyword}`, 'g');
  return baseStr.replace(condition, DF_KEYWORD);
}

export function replaceDFKeywordWith(baseStr, keyword) {
  if (typeof baseStr !== 'string') {
    return;
  }

  const condition = new RegExp(`${DF_KEYWORD}`, 'g');
  return baseStr.replace(condition, keyword);
}

export const simplePluralize = word => `${word}s`;
