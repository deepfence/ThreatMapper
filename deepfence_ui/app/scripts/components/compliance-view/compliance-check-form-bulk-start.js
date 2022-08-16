import React from 'react';
import {Field, reduxForm, formValueSelector} from 'redux-form/immutable';
import {connect} from 'react-redux';
import HorizontalLoader from '../common/app-loader/horizontal-dots-loader';
import {replaceWithDFKeyword} from '../../utils/string-utils';
import {
  clearScanContainerImageRegistryAction,
} from '../../actions/app-actions';

const COMPLIANCE_SCAN_MENU = [
  {
    code: 'standard',
    label: 'System Hardening',
  },
  {
    code: 'cis',
    label: 'CIS',
  },
  {
    code: 'nist_master',
    label: 'NIST Kube Master',
  },
  {
    code: 'nist_slave',
    label: 'NIST Kube Slave',
  },
  {
    code: 'pci',
    label: 'PCI',
  },
  {
    code: 'hipaa',
    label: 'HIPAA',
  },
  {
    code: 'mission_critical_classified',
    label: 'NIST Mission Critical',
  },
];


const validate = (valuesIm) => {
  const errors = {};
  const formValues = valuesIm.toJS();
  const {
    scheduleInterval,
    ...checkTypes
  } = formValues;
  const checkTypesChecked = Object.keys(checkTypes).filter(el => checkTypes[el]);
  if (checkTypesChecked.length === 0) {
    errors._error = 'Select atleast one compliance checktype';
    errors.mission_critical_classified = 'Select atleast one';
  }
  if (scheduleInterval) {
    errors.dummy = 'dummy';
  }

  return errors;
};

const renderField = ({
  input,
  label,
  type,
  disabled = false,
  message,
  warning,
  error,
  loading,
}) => (
  <div className="form-field compliance-check-field">
    <input
      {...input}
      type={type}
      disabled={disabled}
    />
    <span
      className="label"
    >
      {label}
    </span>
    {(loading && <HorizontalLoader style={{top: -30, left: '91%'}} />)}
    {(message && <div className="message">{message}</div>)}
    {(warning && <div className="message warning-message">{warning}</div>)}
    {(error && <div className="message error-message">{error}</div>)}
  </div>
);

class ComplianceCheckForm extends React.PureComponent {
  constructor(props) {
    super(props);
    this.clearAndSubmit = this.clearAndSubmit.bind(this);
    this.state = {};
  }

  componentDidMount() {
    const {
      clearScanContainerImageRegistryAction: clearAction,
    } = this.props;
    clearAction();
  }

  clearAndSubmit(values) {
    const {handleSubmit} = this.props;
    handleSubmit(values);
  }

  render() {
    const {
      submitting,
      errorMessage,
      message,
      error,
      scheduleInterval,
    } = this.props;
    const scanButtonLabel = scheduleInterval ? 'Schedule Scan' : 'Scan Now';
    const complianceScanMasterIndex = COMPLIANCE_SCAN_MENU.reduce((acc, scan) => {
      acc[scan.code] = {
        ...scan,
        notApplicable: false,
      };
      return acc;
    }, {});
    const complianceList = Object.keys(complianceScanMasterIndex).map(
      key => complianceScanMasterIndex[key]
    );
    return (
      <div className="compliance-check-view">
        <div className="compliance-check-form">
          <div
            className="section-body"
          >
            <form onSubmit={this.clearAndSubmit} autoComplete="off">
              {complianceList.sort((a, b) => a.notApplicable - b.notApplicable).map(el => (
                <Field
                  component={renderField}
                  type="checkbox"
                  name={replaceWithDFKeyword(el.code, '.')}
                  label={el.label}
                  key={el.label}
                />
              ))
              }
              <div className="form-field">
                <span className="label">
                  Scan Interval in days (optional)
                </span>
                <Field
                  component="input"
                  type="text"
                  name="scheduleInterval"
                />
              </div>
              <div className="form-field">
                <button
                  className="primary-btn full-width"
                  type="submit"
                  disabled={submitting && error}
                 >
                  {scanButtonLabel}
                </button>
                <div>
                  {error && (
                  <span className="warning-message">
                    {' '}
                    {error}
                    {' '}
                  </span>
                  )}
                  {errorMessage && (
                  <span className="error-message">
                    {' '}
                    {errorMessage}
                    {' '}
                  </span>
                  )}
                  {message && (
                  <span>
                    {' '}
                    {message}
                    {' '}
                  </span>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
}
const selector = formValueSelector('compliance-check');
const mapStateToProps = state => ({
  complianceAddViewIm: state.getIn(['compliance', 'add_view']),
  loading: state.getIn(['cve', 'container_image_registry', 'scan_registry', 'loading']),
  errorMessage: state.getIn(['cve', 'container_image_registry', 'scan_registry', 'error', 'message']),
  message: state.getIn(['cve', 'container_image_registry', 'scan_registry', 'message']),
  scheduleInterval: selector(state, 'scheduleInterval'),
});

export default connect(mapStateToProps, {
  clearScanContainerImageRegistryAction,
})(reduxForm({
  form: 'compliance-check',
  validate,
})(ComplianceCheckForm));
