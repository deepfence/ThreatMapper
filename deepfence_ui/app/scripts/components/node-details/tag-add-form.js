import React from 'react';
import {reduxForm, Field} from 'redux-form/immutable';
import Loader from '../common/app-loader/horizontal-dots-loader';

const validate = (values) => {
  const error = {};
  const tag = values.get('tag');
  if (tag && tag.indexOf(',') >= 0) {
    error.tag = 'Comma charater not allowed';
  }
  return error;
};

const renderField = ({
  input,
  type,
  placeholder,
  disabled = false,
  meta:
    {
      touched,
      error,
      warning
    }
}) => (
  <div>
    <div>
      <input {...input} placeholder={placeholder} type={type} disabled={disabled} />
    </div>
    {touched && ((error && <span className="error-message">{error}</span>) || (warning && <span className="warning-message">{warning}</span>))}
  </div>
);

class TagAddForm extends React.PureComponent {
  constructor(props) {
    super(props);
    this.submitClickHandler = this.submitClickHandler.bind(this);
  }

  submitClickHandler(values) {
    const {
      handleSubmit,
      reset,
    } = this.props;
    return handleSubmit(values).then(() => reset());
  }

  render() {
    const {
      submitting,
      pristine,
    } = this.props;
    return (
      <div className="df-modal-form">
        <form onSubmit={this.submitClickHandler} autoComplete="off">
          <div className="form-field">
            <div> Tag Name </div>
            <Field
              name="tag"
              component={renderField}
            />
          </div>
          <div className="form-field">
            <button
              className="primary-btn full-width relative"
              type="submit"
              disabled={submitting || pristine}
             >
              Add tags
              {submitting && <Loader style={{ left: '90%', top: '-136%'}} />}
            </button>
          </div>
        </form>
      </div>
    );
  }
}

export default reduxForm({
  form: 'tag-add',
  validate,
})(TagAddForm);
