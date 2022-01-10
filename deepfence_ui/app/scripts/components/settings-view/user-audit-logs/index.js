import React, { useEffect, useState } from 'react';
import { isEmpty } from 'lodash';
import { connect } from 'react-redux';
import { dateTimeFormat } from '../../../utils/time-utils';
import { DfTableV2 } from '../../common/df-table-v2';
import { getUserAuditLogAction } from '../../../actions/app-actions';

const UserAuditLogs = props => {
  const [page, setPage] = useState(0);

  useEffect(() => {
    const { dispatchAuditLogs } = props;
    const pageSize = 15;
    const apiParams = {
      size: pageSize,
      start_index: page * pageSize,
    };
    dispatchAuditLogs(apiParams);
  }, [page]);

  // eslint-disable-next-line class-methods-use-this
  const convertStringToJson = str => {
    if (!isEmpty(str)) {
      const jsonOnj = JSON.stringify(str);
      return JSON.parse(jsonOnj);
    }
    return '';
  };

  const { userAuditLogs = [], totalUserAuditLogs } = props;
  // this has to come from API, Change it once added in the API.
  const totalPage = totalUserAuditLogs;
  return (
    // using the same same css class for the scheduled jobs in
    // settings page. Please check here, if any time make changes to schedule jobs.
    <div>
      <div className="scheduled-job-padding">
        <DfTableV2
          data={userAuditLogs}
          page={page}
          onPageChange={newPage => {
            setPage(newPage);
          }}
          columns={[
            {
              Header: 'Timestamp',
              accessor: row => dateTimeFormat(row.created_at),
              id: 'created',
              width: 120,
            },
            {
              Header: 'Event',
              accessor: 'event',
              width: 80,
            },
            {
              Header: 'Action',
              accessor: 'action',
              width: 80,
            },
            {
              Header: 'User Email',
              accessor: 'user_email',
              width: 130,
            },
            {
              Header: 'User Role',
              accessor: 'user_role',
              width: 100,
            },
            {
              Header: 'Resources',
              style: { whiteSpace: 'unset' },
              Cell: cell => <div>{convertStringToJson(cell.value)}</div>,
              noWrap: 'true',
              accessor: 'resource',
              width: 500,
            },
            {
              Header: 'Success',
              accessor: 'success',
              Cell: cell => <div>{cell.value === true ? 'True' : 'False'}</div>,
              width: 60,
            },
          ]}
          showPagination
          totalRows={totalUserAuditLogs}
          defaultPageSize={15}
          pages={totalPage}
          manual
        />
      </div>
    </div>
  );
};

const mapStateToProps = state => ({
  tasks: state.getIn(['scheduledTasks', 'data']),
  userAuditLogs: state.getIn(['userAuditLogs', 'data']),
  totalUserAuditLogs: state.getIn(['userAuditLogs', 'total']),
});

export default connect(mapStateToProps, {
  dispatchAuditLogs: getUserAuditLogAction,
})(UserAuditLogs);
