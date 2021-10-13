/*eslint-disable*/

// React imports
import React from 'react';
import { connect } from 'react-redux';

class EmailConfigurationTableView extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  getTableHeaderView() {
    const { 
      recordCollection,
    } = this.props;
    const record = recordCollection[0];
    return (
      <tr style={{border: 'none'}}>
        { record.id && <th> Id </th> }
        { record.email_provider && <th> Email provider </th> }
        { record.email_config.email && <th> Email </th> }
        { record.email_config.ses_region && <th> SES region </th> }
        { record.smtp && <th> SMTP </th> }
        { record.port && <th> Port </th> }
        <th style={{textAlign: 'center'}}>Action</th>
      </tr>
    )
  }

  getTableView() {
    const {recordCollection} = this.props;
    const deleteBtnStyles = {
      color: '#db2547',
      cursor: 'pointer'
    };

    return (
      recordCollection.map((record) => {
        const {
        } = record;
        return (
          <tr key={`${record.id}-${record.notification_type}`}>
            { record.id && <td>{ record.id }</td> }
            { record.email_provider && <td>{ record.email_provider }</td> }
            { record.email_config.email && <td>{ record.email_config.email }</td> }
            { record.email_config.ses_region && <td>{ record.email_config.ses_region }</td> }
            <td className='text-center'>
              <i className="fa fa-trash-o" style={deleteBtnStyles} aria-hidden="true" onClick={()=> this.deleteEmailConfiguration(record)}></i>
            </td>
          </tr>
        )}
      )
    );
  };

  deleteEmailConfiguration(record) {
    this.props.onDeleteRequestCallback(record);
  }

  render() {
    return (
      <div className='email-integration-collection-wrapper'>
        <table className="table">
          <thead>
          { this.getTableHeaderView() }
          </thead>
          <tbody>
          { this.getTableView() }
          </tbody>
        </table>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {};
}

export default connect(
  mapStateToProps
)(EmailConfigurationTableView);
