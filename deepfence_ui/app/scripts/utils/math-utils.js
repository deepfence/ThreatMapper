/* eslint-disable no-restricted-globals */

export function isNumber(value) {
  if (!isNaN(parseFloat(value)) && isFinite(value)) {
    return true;
  }
  return false;
}

export function isInteger(valueStr, {positive = false, negative = false}) {
  if (!valueStr) {
    return false;
  }
  if (valueStr.trim() && valueStr.length === 0) {
    return false;
  }

  const valueNum = Math.floor(Number(valueStr));

  if (valueNum === Infinity) {
    return false;
  }
  if (String(valueNum) !== valueStr) {
    return false;
  }
  if (positive && valueNum <= 0) {
    return false;
  }
  if (negative && valueNum > -1) {
    return false;
  }
  return true;
}

export function isPositiveInteger(valueStr) {
  return isInteger(valueStr, {positive: true});
}
