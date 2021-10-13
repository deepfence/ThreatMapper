/* eslint-disable no-restricted-globals */
import { escapeRegExp } from 'lodash';
import { slugify } from './string-utils';
import {updateSearchQueryArr, luceneQueryChecker} from './array-utils';


/**
 * Returns a RegExp from a given string. If the string is not a valid regexp,
 * it is escaped. Returned regexp is case-insensitive.
 */
function makeRegExp(expression, options = 'i') {
  try {
    return new RegExp(expression, options);
  } catch (e) {
    return new RegExp(escapeRegExp(expression), options);
  }
}

/**
 * Returns the float of a metric value string, e.g. 2 KB -> 2048
 */
function parseValue(value) {
  let parsed = parseFloat(value);
  if ((/k/i).test(value)) {
    parsed *= 1024;
  } else if ((/m/i).test(value)) {
    parsed *= 1024 * 1024;
  } else if ((/g/i).test(value)) {
    parsed *= 1024 * 1024 * 1024;
  } else if ((/t/i).test(value)) {
    parsed *= 1024 * 1024 * 1024 * 1024;
  }
  return parsed;
}

/**
 * True if a prefix matches a field label
 * Slugifies the label (removes all non-alphanumerical chars).
 */
function matchPrefix(label, prefix) {
  if (label && prefix) {
    return (makeRegExp(prefix)).test(slugify(label));
  }
  return false;
}

/**
 * Adds a match to nodeMatches under the keyPath. The text is matched against
 * the query. If a prefix is given, it is matched against the label (skip on
 * no match).
 * Returns a new instance of nodeMatches.
 */
function findNodeMatch(nodeMatches, keyPath, text, query, prefix, label, truncate) {
  if (!prefix || matchPrefix(label, prefix)) {
    const queryRe = makeRegExp(query);
    const matches = text.match(queryRe);
    if (matches) {
      const firstMatch = matches[0];
      const index = text.search(queryRe);
      nodeMatches = nodeMatches.setIn(keyPath,
        {
          text, label, start: index, length: firstMatch.length, truncate
        });
    }
  }
  return nodeMatches;
}

/**
 * If the metric matches the field's label and the value compares positively
 * with the comp operator, a nodeMatch is added
 */
function findNodeMatchMetric(nodeMatches, keyPath, fieldValue, fieldLabel, metric, comp, value) {
  if (slugify(metric) === slugify(fieldLabel)) {
    let matched = false;
    switch (comp) {
      case 'gt': {
        if (fieldValue > value) {
          matched = true;
        }
        break;
      }
      case 'lt': {
        if (fieldValue < value) {
          matched = true;
        }
        break;
      }
      case 'eq': {
        if (fieldValue === value) {
          matched = true;
        }
        break;
      }
      default: {
        break;
      }
    }
    if (matched) {
      nodeMatches = nodeMatches.setIn(keyPath,
        {fieldLabel, metric: true});
    }
  }
  return nodeMatches;
}


export function constructGlobalSearchQuery(existingQuery, newQueryParams) {
  const newQueryStr = Object.keys(newQueryParams).map(
    key => `${key}:"${newQueryParams[key]}"`
  ).join(' AND ');
  const newQuery = `(${newQueryStr})`;
  const isLuceneQueryExist = luceneQueryChecker(existingQuery, newQuery);
  let updatedQuery = [];
  if (existingQuery.length > 0) {
    if (!isLuceneQueryExist) {
      updatedQuery = updateSearchQueryArr(existingQuery, newQuery);
    } else {
      updatedQuery = existingQuery;
    }
  } else {
    updatedQuery.push(newQuery);
  }
  return updatedQuery;
}

export const testable = {
  findNodeMatch,
  findNodeMatchMetric,
  matchPrefix,
  makeRegExp,
  parseValue,
};
