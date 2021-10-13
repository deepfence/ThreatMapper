/* eslint-disable react/destructuring-assignment */
import React from 'react';
import {Field, reduxForm} from 'redux-form/immutable';
import {connect} from 'react-redux';
import DFSelectField from '../../common/multi-select/redux-form-field';
import {
  userUpdateViewClearAction,
} from '../../../actions/app-actions';

const availableRoles = [
  {
    label: 'admin',
    value: 'admin',
  },
  {
    label: 'user',
    value: 'user',
  },
  {
    label: 'read only user',
    value: 'read_only_user',
  }
];

const availableStatus = [
  {
    label: 'Active',
    value: true,
  },
  {
    label: 'Inactive',
    value: false,
  }
];

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

class UserForm extends React.Component {
  constructor(props) {
    super(props);
    this.submitClickHandler = this.submitClickHandler.bind(this);
  }

  componentDidMount() {
    this.props.dispatch(userUpdateViewClearAction());
  }

  submitClickHandler(values) {
    const {handleSubmit} = this.props;
    handleSubmit(values);
  }

  render() {
    const {
      message,
      error,
    } = this.props;
    return (
      <div>
        <form className="df-modal-form" onSubmit={this.submitClickHandler} autoComplete="off">
          <div className="form-field">
            <div
              className="label"
            >
              First Name
            </div>
            <Field
              name="first_name"
              component={renderField}
            />
          </div>
          <div className="form-field">
            <div
              className="label"
            >
              Last Name
            </div>
            <Field
              name="last_name"
              component={renderField}
            />
          </div>
          <Field
            name="role"
            component={DFSelectField}
            options={availableRoles}
            title="Role"
          />
          <Field
            name="isActive"
            component={DFSelectField}
            options={availableStatus}
            title="Status"
          />
          <div className="form-field">
            <button
              className="primary-btn"
              type="submit"
            >
              Submit
            </button>
          </div>
        </form>
        {message && (
        <span className="info-message">
          {' '}
          {message}
          {' '}
        </span>
        )}
        {error && (
        <span className="error-message">
          {' '}
          {error}
          {' '}
        </span>
        )}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    message: state.getIn(['updateUserView', 'message']),
    error: state.getIn(['updateUserView', 'error']),
  };
}
export default reduxForm({
  form: 'user-porfile',
})(connect(mapStateToProps)(UserForm));
