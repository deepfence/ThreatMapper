/* eslint-disable arrow-body-style */

import difference from "lodash/difference";

export const convertDocumentToKeyValuePairs = (data = {}, hiddenFields=[], sortedKeys = []) => {
  sortedKeys = sortedKeys.filter((sortedKey) => Object.hasOwnProperty.apply(data, [sortedKey]));
  hiddenFields = hiddenFields.filter((key) => Object.hasOwnProperty.apply(data, [key]));
  const keys = difference(Object.keys(data), hiddenFields);
  const unsortedKeys = difference(keys, sortedKeys);

  return [
    ...sortedKeys.map((sortedKey) => {
      return {
        key: sortedKey,
        value: data[sortedKey]
      }
    }),
    ...unsortedKeys.map((unSortedKey) => {
      return {
        key: unSortedKey,
        value: data[unSortedKey]
      }
    })
  ]
}
