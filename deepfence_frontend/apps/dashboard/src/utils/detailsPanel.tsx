import { isNil } from 'lodash-es';

export function getFieldsKeyValue<T extends Record<string, any>>(
  issueObj: T,
  fieldsConfig: {
    hiddenFields: Array<keyof T>;
    priorityFields: Array<keyof T>;
  },
): Array<{
  key: keyof T;
  value: T[keyof T] | '-';
}> {
  const result: ReturnType<typeof getFieldsKeyValue> = [];

  const emptyFields: Array<keyof T> = [];

  const nonPriorityKeys = (Object.keys(issueObj) as Array<keyof T>).filter((key) => {
    return (
      !fieldsConfig.priorityFields.includes(key) &&
      !fieldsConfig.hiddenFields.includes(key)
    );
  });

  fieldsConfig.priorityFields.forEach((key) => {
    if (isEmptyValue(issueObj[key])) {
      emptyFields.push(key);
    } else {
      result.push({
        key,
        value: issueObj[key],
      });
    }
  });

  nonPriorityKeys.forEach((key) => {
    if (isEmptyValue(issueObj[key])) {
      emptyFields.push(key);
    } else {
      result.push({
        key,
        value: issueObj[key],
      });
    }
  });

  emptyFields.forEach((key) => {
    result.push({
      key,
      value: '-',
    });
  });

  return result;
}

function isEmptyValue(value: unknown): boolean {
  if (isNil(value)) {
    return true;
  } else if (typeof value === 'string') {
    if (!value.length) return true;
  } else if (Array.isArray(value)) {
    if (!value.length) return true;
    if (value.every((v) => isEmptyValue(v))) return true;
  }

  return false;
}
