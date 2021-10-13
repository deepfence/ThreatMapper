import React from 'react';
import {reduxForm, Field} from 'redux-form/immutable';
import DFSelectField from '../multi-select/redux-form-field';

const periodOptions = [
  {
    label: 'Today',
    value: 'day',
  }, {
    label: 'Current Week',
    value: 'week',
  }, {
    label: 'Current Month',
    value: 'month',
  }, {
    label: 'Current Year',
    value: 'year',
  }
];

class ReportDownloadForm extends React.PureComponent {
  render() {
    const {handleSubmit, submitting, pristine} = this.props;
    return (
      <div className="report-download-form">
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <Field
              name="period_id"
              component={DFSelectField}
              options={periodOptions}
              value="month"
              clearable={false}
              placeholder="Choose Period"
            />
          </div>
          <div className="form-field" style={{width: '200px'}}>
            <button
              type="submit"
              className="btn-download"
              disabled={submitting || pristine}
            >
              Download
            </button>
          </div>
        </form>
      </div>
    );
  }
}

export default reduxForm({
  form: 'report_download',
})(ReportDownloadForm);
