import React from 'react';
import {Field, reduxForm} from 'redux-form/immutable';
import ToggleSwitchField from '../common/toggle-switch/redux-form-field';

class MaskFilterForm extends React.PureComponent {
  render() {
    return (
      <div className="hideMasked">
        <span>Hide Masked</span>
        <Field
          name="hideMasked"
          component={ToggleSwitchField}
        />
      </div>
    );
  }
}

export default reduxForm({
  form: 'compliance-mask-filter-form',
  initialValues: {
    hideMasked: true,
  }
})(MaskFilterForm);
