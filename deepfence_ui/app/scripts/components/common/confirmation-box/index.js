import React from 'react';
import { reduxForm, Field } from 'redux-form/immutable';

const renderCheckboxInput = ({ name, label } = {}) => (
  <div className="input-component">
    <Field component="input" type="checkbox" name={name} id={name} />
    <span className="label">{label}</span>
    <span className="check" />
  </div>
);

const renderRadioInput = ({ name, label, value, id } = {}) => (
  <div
    className="input-component"
    style={{
      display: 'flex',
      flexWrap: 'nowrap',
      flexDirection: 'row',
      alignContent: 'center',
      justifyContent: 'flex-start',
      alignItems: 'center',
    }}
  >
    <Field component="input" type="radio" name={name} value={value} id={id} />
    <span className="label">{label}</span>
    <span className="radio" />
  </div>
);

const renderTextInput = ({ name, label, placeholder, type } = {}) => (
  <div className="input-component">
    <span className="label">{label}</span>
    <Field
      component="input"
      type={type}
      name={name}
      placeholder={placeholder}
    />
  </div>
);

const renderAdditionalInputs = (inputList = []) =>
  inputList.map(inputObj => {
    switch (inputObj.type) {
      case 'checkbox':
        return renderCheckboxInput(inputObj);
      case 'radio':
        return renderRadioInput(inputObj);
      case 'text':
      case 'password':
        // TODO: Apply styles and expose it through props
        return renderTextInput(inputObj);
      default:
        return <span />;
    }
  });

const className = title => {
  if (title === 'Agent Deregister') {
    return 'additional-inputs agent-deregister';
  }
  return 'additional-inputs';
};
class ConfirmationBox extends React.PureComponent {
  constructor(props) {
    super(props);
    this.handleConfirmButtonClick = this.handleConfirmButtonClick.bind(this);
  }

  handleConfirmButtonClick(values) {
    const { handleSubmit } = this.props;
    return handleSubmit(values);
  }

  render() {
    const {
      title,
      body,
      onCancelButtonClick,
      confirmButtonText,
      disableConfirmButton,
      cancelButtonText,
      additionalInputs,
      error,
    } = this.props;
    return (
      <div className="confirmation-box">
        <div className="title">{title}</div>
        <div className="body">
          {body}
          <div className={className(title)}>
            {renderAdditionalInputs(additionalInputs)}
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
        <div className="action">
          <button
            type="submit"
            onClick={onCancelButtonClick}
            className="cbtn cancel-btn"
          >
            {cancelButtonText}
          </button>
          <button
            type="submit"
            onClick={this.handleConfirmButtonClick}
            className="cbtn confirm-btn"
            disabled={disableConfirmButton}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    );
  }
}

export default reduxForm({
  form: 'dialogConfirmation',
})(ConfirmationBox);
