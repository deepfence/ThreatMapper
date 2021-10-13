export const keyLabelizer = (obj) => {
  if (obj === undefined || obj === null) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  return Object.keys(obj).map(key => ({
    label: key,
    value: keyLabelizer(obj[key]),
  }));
};
