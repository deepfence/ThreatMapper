/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { isEmpty } from 'lodash';
import {connect} from 'react-redux';
import {dateTimeFormat} from '../../../utils/time-utils';
import { DfTableV2 } from '../../common/df-table-v2';
import {
  getUserAuditLogAction
} from '../../../actions/app-actions';

class UserAuditLogs extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      page: 0
    };
    this.convertStringToJson = this.convertStringToJson.bind(this);
  }

  componentDidMount() {
    const {
      dispatchAuditLogs
    } = this.props;
    const { page } = this.state;
    const pageSize = 15;
    const apiParams = {
      size: pageSize,
      start_index: page * pageSize
    };

    dispatchAuditLogs(apiParams);
  }

  componentDidUpdate(prevProp, prevState) {
    if (this.state.page !== prevState.page) {
      const { page } = this.state;
      const {
        dispatchAuditLogs
      } = this.props;
      const pageSize = 15;
      const apiParams = {
        size: pageSize,
        start_index: page * pageSize
      };
      dispatchAuditLogs(apiParams);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  convertStringToJson(str) {
    if (!isEmpty(str)) {
      const jsonOnj = JSON.stringify(str);
      return JSON.parse(jsonOnj);
    }
    return '';
  }

  render() {
    const {
      userAuditLogs = [],
      totalUserAuditLogs
    } = this.props;
    const {
      page
    } = this.state;
    // this has to come from API, Change it once added in the API.
    const totalPage = totalUserAuditLogs;
    return (
    // using the same same css class for the scheduled jobs in
    // settings page. Please check here, if any time make changes to schedule jobs.
    // pagination does not works for table yet. 
      <div>
        <div className="scheduled-job-padding">
          <DfTableV2
          data={userAuditLogs}
          page={page}
          onPageChange={(newPage) => { this.setState({page: newPage, }); }}
          columns={[
            {
              Header: 'Timestamp',
              accessor: row => (
                dateTimeFormat(row.created_at)
              ),
              id: 'created',
              maxWidth: 200,
            },
            {
              Header: 'Event',
              accessor: 'event',
              maxWidth: 150,
            },
            {
              Header: 'Action',
              accessor: 'action',
              maxWidth: 150,
            },
            {
              Header: 'User Email',
              accessor: 'user_email',
              maxWidth: 250,
            },
            {
              Header: 'User Role',
              accessor: 'user_role',
              maxWidth: 150,
            },
            {
              Header: 'Resources',
              style: { whiteSpace: 'unset' },
              Cell: cell => (
                <div>
                  {this.convertStringToJson(cell.value)}
                </div>
              ),
              accessor: 'resource',
              minWidth: 300,
            },
            {
              Header: 'Success',
              accessor: 'success',
              Cell: cell => (
                <div>
                  {cell.value === true ? 'True' : 'False'}
                </div>
              ),
              maxWidth: 150,
            },
          ]}
          showPagination
          defaultPageSize={15}
          pages={totalPage}
          manual />
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  tasks: state.getIn(['scheduledTasks', 'data']),
  userAuditLogs: state.getIn(['userAuditLogs', 'data']),
  totalUserAuditLogs: state.getIn(['userAuditLogs', 'total'])
});

export default connect(mapStateToProps, {
  dispatchAuditLogs: getUserAuditLogAction,
})(UserAuditLogs);
