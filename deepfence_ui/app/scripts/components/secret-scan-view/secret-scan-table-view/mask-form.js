import React from 'react';
import { Field, reduxForm } from 'redux-form/immutable';
import ToggleSwitchField from '../../common/toggle-switch/redux-form-field';

const MaskForm = () => (
  <div className="hideMasked">
    <span>Hide Masked</span>
    <Field name="hideMasked" component={ToggleSwitchField} />
  </div>
);

export default reduxForm({
  form: 'secrets-mask-form',
  initialValues: {
    hideMasked: true,
  },
})(MaskForm);
