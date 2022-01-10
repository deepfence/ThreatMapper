/* eslint-disable */
// React imports
import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';

// Custom component imports
import DFSelect from '../../common/multi-select/app';
import EmailConfigurationTableView from '../../common/email-configuration-table-view/email-configuration-table-view';

import {
  deleteMailConfigurationsAction,
  getAllMailConfigurationsAction,
  addMailConfigurationAction,
  showModal,
} from '../../../actions/app-actions';
import AppLoader from '../../common/app-loader/app-loader';
import { NO_MAIL_CONFIGURATIONS_MESSAGE } from '../../../constants/visualization-config';

const resourceCollection = [
  {
    name: 'Google SMTP',
    value: 'smtp',
  },
  {
    name: 'Amazon SES',
    value: 'amazon_ses',
  },
];

const EmailConfiguration = props => {
  const [emailProvider, setEmailProvider] = useState({
    value: 'smtp',
    label: 'Google SMTP',
  });
  const [isSuccess, setisSuccess] = useState(false);
  const [isError, setisError] = useState(false);
  const [submitted, setsubmitted] = useState(false);
  const [email_smtp, setEmail_smtp] = useState();
  const [password, setPassword] = useState();
  const [port, setPort] = useState();
  const [smtp, setSmtp] = useState();
  const [ses_region, setSes_region] = useState();
  const [amazon_access_key, setAmazon_access_key] = useState();
  const [amazon_secret_key, setAmazon_secret_key] = useState();
  const [email_ses, setEmail_ses] = useState();

  useEffect(() => {
    fetchMailConfigurationList();
  }, []);

  const fetchMailConfigurationList = () => {
    props.dispatch(getAllMailConfigurationsAction());
  };

  const handleChange = e => {
    switch (e.target.name) {
      case 'email_smtp':
        setEmail_smtp(e.target.value);
        break;
      case 'password':
        setPassword(e.target.value);
        break;
      case 'port':
        setPort(e.target.value);
        break;
      case 'smtp':
        setSmtp(e.target.value);
        break;
      case 'ses_region':
        setSes_region(e.target.value);
        break;
      case 'amazon_access_key':
        setAmazon_access_key(e.target.value);
        break;
      case 'amazon_secret_key':
        setAmazon_secret_key(e.target.value);
        break;
      case 'email_ses':
        setEmail_ses(e.target.value);
        break;
      default:
        break;
    }
  };

  const handleResourceChange = e => {
    setEmailProvider(e);
  };

  const handleSubmit = e => {
    e.preventDefault();
    setsubmitted(true);
    let params;
    let flag = true;

    if (emailProvider.value === 'smtp') {
      params = {
        email_provider: emailProvider.value,
        email: email_smtp,
        smtp: smtp,
        port: port,
        password: password,
      };
    }

    if (emailProvider.value === 'amazon_ses') {
      params = {
        email_provider: emailProvider.value,
        email: email_ses,
        amazon_access_key: amazon_access_key,
        amazon_secret_key: amazon_secret_key,
        ses_region: ses_region,
      };
    }
    Object.keys(params).map(k => {
      if (!params[k] || params[k] == '') flag = false;
    });
    flag && props.dispatch(addMailConfigurationAction(params));
    setTimeout(() => {
      props.dispatch(getAllMailConfigurationsAction());
    }, 1000);
  };

  const getEnabledBtnView = () => {
    return (
      <button type="button" className="app-btn" onClick={e => handleSubmit(e)}>
        Save changes
      </button>
    );
  };

  const EmailConfigurationFormView = () => {
    const { addMailConfigurationError } = props;
    const columnStyle = {
      padding: '0px 60px',
    };
    return (
      <div className="form-wrapper" style={{ paddingTop: '10px' }}>
        <form name="form" style={{ maxWidth: 'unset' }}>
          <div className="container-fluid">
            <div className="row">
              <div className="col-12 col-md-6">
                <div className="" style={{ columnStyle }}>
                  <div className="wrapper-heading">Choose Mailer Type*</div>
                  <br />
                  <div className="resource-option-wrapper">
                    <div className="df-select-field">
                      <DFSelect
                        options={resourceCollection.map(el => ({
                          value: el.value,
                          label: el.name,
                        }))}
                        onChange={e => handleResourceChange(e)}
                        placeholder="Mailer type"
                        value={emailProvider}
                        clearable={false}
                      />
                    </div>
                  </div>
                  <br />
                  <div className="row">
                    {emailProvider.value === 'smtp' && (
                      <div className="col-md-6">
                        <div
                          className={
                            'form-group' +
                            (submitted && !email_smtp ? ' has-error' : '')
                          }
                        >
                          <input
                            type="text"
                            className="form-control"
                            name="email_smtp"
                            placeholder="Email"
                            onChange={e => handleChange(e)}
                          />
                          {submitted && !email_smtp && (
                            <div className="field-error">Email is required</div>
                          )}
                        </div>
                      </div>
                    )}
                    {emailProvider.value === 'smtp' && (
                      <div className="col-md-6">
                        <div
                          className={
                            'form-group' +
                            (submitted && !password ? ' has-error' : '')
                          }
                        >
                          <input
                            type="password"
                            className="form-control"
                            name="password"
                            placeholder="App password"
                            onChange={e => handleChange(e)}
                          />
                          {submitted && !password && (
                            <div className="field-error">
                              App password is required
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {emailProvider.value === 'amazon_ses' && (
                      <div className="col">
                        <div
                          className={
                            'form-group' +
                            (submitted && !email_ses ? ' has-error' : '')
                          }
                        >
                          <input
                            type="text"
                            className="form-control"
                            name="email_ses"
                            placeholder="Email"
                            onChange={e => handleChange(e)}
                          />
                          {submitted && !email_ses && (
                            <div className="field-error">Email is required</div>
                          )}
                        </div>
                      </div>
                    )}

                    {emailProvider.value === 'amazon_ses' && (
                      <div className="col">
                        <div
                          className={
                            'form-group' +
                            (submitted && !ses_region ? ' has-error' : '')
                          }
                        >
                          <input
                            type="text"
                            className="form-control"
                            name="ses_region"
                            placeholder="SES region"
                            onChange={e => handleChange(e)}
                          />
                          {submitted && !ses_region && (
                            <div className="field-error">
                              SES region is required
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="row">
                    {emailProvider.value === 'smtp' && (
                      <div className="col">
                        <div
                          className={
                            'form-group' +
                            (submitted && !smtp ? ' has-error' : '')
                          }
                        >
                          <input
                            type="text"
                            className="form-control"
                            name="smtp"
                            placeholder="SMTP server"
                            onChange={e => handleChange(e)}
                          />
                          {submitted && !smtp && (
                            <div className="field-error">
                              SMTP server is required
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {emailProvider.value === 'smtp' && (
                      <div className="col">
                        <div
                          className={
                            'form-group' +
                            (submitted && !port ? ' has-error' : '')
                          }
                        >
                          <input
                            type="number"
                            className="form-control"
                            name="port"
                            placeholder="Gmail SMTP port (SSL)"
                            onChange={e => handleChange(e)}
                          />
                          {submitted && !port && (
                            <div className="field-error">
                              Gmail SMTP port (SSL) is required
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {emailProvider.value === 'amazon_ses' && (
                      <div className="col">
                        <div
                          className={
                            'form-group' +
                            (submitted && !amazon_access_key
                              ? ' has-error'
                              : '')
                          }
                        >
                          <input
                            type="text"
                            className="form-control"
                            name="amazon_access_key"
                            placeholder="Amazon access key"
                            onChange={e => handleChange(e)}
                          />
                          {submitted && !amazon_access_key && (
                            <div className="field-error">
                              Amazon access key is required
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {emailProvider.value === 'amazon_ses' && (
                      <div className="col">
                        <div
                          className={
                            'form-group' +
                            (submitted && !amazon_secret_key
                              ? ' has-error'
                              : '')
                          }
                        >
                          <input
                            type="text"
                            className="form-control"
                            name="amazon_secret_key"
                            placeholder="Amazon secret key"
                            onChange={e => handleChange(e)}
                          />
                          {submitted && !amazon_secret_key && (
                            <div className="field-error">
                              Amazon secret key is required
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <br />
                <div className="form-group col-md-3" style={{ paddingLeft: 0 }}>
                  {getEnabledBtnView()}
                </div>
                <div className="error-msg-container">
                  {addMailConfigurationError && (
                    <div className="message error-message">
                      {addMailConfigurationError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  };

  const deleteMailConfiguration = record => {
    const params = {
      id: record.id,
    };
    return props.dispatch(deleteMailConfigurationsAction(params));
  };

  const handleDeleteDialog = record => {
    const params = {
      dialogTitle: 'Delete mail configuration?',
      dialogBody: 'Are you sure you want to delete this mail configuration?',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'No, Keep',
      onConfirmButtonClick: () => deleteMailConfiguration(record),
    };
    props.dispatch(showModal('DIALOG_MODAL', params));
  };

  const getIntegrationTableView = () => {
    return (
      <EmailConfigurationTableView
        recordCollection={props.mailConfigurationList}
        onDeleteRequestCallback={record => handleDeleteDialog(record)}
      />
    );
  };

  const getTableEmptyState = data => {
    const emptyStateWrapper = {
      height: '400px',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
    return (
      <div style={emptyStateWrapper}>
        {data === undefined ? <AppLoader /> : getEmptyStateView()}
      </div>
    );
  };

  const getEmptyStateView = () => {
    return (
      <div className="empty-state-wrapper">
        {NO_MAIL_CONFIGURATIONS_MESSAGE.message}
      </div>
    );
  };

  const isDataAvailable = data => {
    let result;
    if (data && data.length > 0) {
      result = true;
    } else {
      result = false;
    }
    return result;
  };

  const { mailConfigurationList } = props;
  return (
    <div className="email-integration-view-wrapper">
      <div className="integration-form-section">
        {EmailConfigurationFormView()}
      </div>
      <div className="integration-list-section" style={{ marginLeft: '-6px' }}>
        {isDataAvailable(mailConfigurationList)
          ? getIntegrationTableView()
          : getTableEmptyState(mailConfigurationList)}
      </div>
    </div>
  );
};

const mapStateToProps = state => {
  return {
    isSuccess: state.get('isSuccess'),
    isError: state.get('isError'),
    mailConfigurationList: state.get('mail_configurations'),
    addMailConfigurationError: state.get('mail_configurations_error'),
  };
};

export default connect(mapStateToProps)(EmailConfiguration);
