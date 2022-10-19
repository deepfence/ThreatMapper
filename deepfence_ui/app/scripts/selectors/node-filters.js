import { createSelector } from 'reselect';
import { Map } from 'immutable';
import { getFormValues } from 'redux-form/immutable';

// TODO: Get rid of this logic by unifying `nodes` and `nodesByTopology` global states.

const selectorFunc = (formValuesIm = Map()) => {
  const formValues = formValuesIm.toJS();
  return Object.keys(formValues).reduce((acc, key) => {
    const value = formValues[key];
    if (Array.isArray(value)) {
      acc[key] = value.map(el => el.value || el);
    } else {
      acc[key] = value.value || value;
    }
    return acc;
  }, {});
}

// read values from nodes-filter redux form and
// convert object values of DFSelect to single values
export const nodeFilterValueSelector = createSelector(
  [
    state => getFormValues('nodes-filter')(state),
  ],
  selectorFunc
);

export const alertSummaryFilterValueSelector = createSelector(
  [
    state => getFormValues('alert-summary-filters')(state),
  ],
  selectorFunc
);

const selectorCache = {};

// eslint-disable-next-line arrow-body-style
export const createCustomSelector = (formName) => {
  if (!selectorCache[formName]) {
    selectorCache[formName] = createSelector(
      [
        state => getFormValues(formName)(state),
      ],
      selectorFunc
    );
  }

  return selectorCache[formName];
};

const historyBoundCreateSelector = createSelector(
  [
    state => {
      return state.get('alertPanelHistoryBound')
    },
  ],
  (data) =>  data
);

const globalSearchCreateSelector = createSelector(
  [
    state => state.get('globalSearchQuery')
  ],
  (data) =>  data
);
/**
 * table page index will reset to 0 if anyone of these values are changed
 * i) lucence search
 * ii) from selection change
 *
 */
export const resetTablePageIndexSelector = createSelector(
  historyBoundCreateSelector,
  globalSearchCreateSelector,
  (bound,search) => {
    return {
      bound,
      search
    }
  }
);
