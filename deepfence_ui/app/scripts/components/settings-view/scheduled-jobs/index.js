import React from 'react';
import { connect } from 'react-redux';
import { dateTimeFormat } from '../../../utils/time-utils';
import { DfTableV2 } from '../../common/df-table-v2';
import {
  getScheduledTasksAction,
  updateScheduledTasksAction,
} from '../../../actions/app-actions';

const PAGE_SIZE = 20;
class ScheduledJobs extends React.Component {
  constructor(props) {
    super(props);
    this.getScheduledJobs = this.getScheduledJobs.bind(this);
  }

  componentDidMount() {
    this.getScheduledJobs();
  }

  updateTasks(params) {
    const {
      updateScheduledTasksAction: action,
    } = this.props;
    return action(params);
  }

  getScheduledJobs() {
    const {
      getScheduledTasksAction: action,
    } = this.props;
    return action();
  }

  render() {
    const {
      tasks = [],
    } = this.props;
    return (
      <div>
        <div className="scheduled-job-padding">
          <DfTableV2
            data={tasks}
            enableSorting
            showPagination
            defaultPageSize={PAGE_SIZE}
            columns={[
              {
                Header: 'Timestamp',
                accessor: row => (
                  dateTimeFormat(row.created_at)
                ),
                id: 'created',
                width: 100
              },
              {
                Header: 'Node Type',
                accessor: 'node_type',
                width: 70
              },
              {
                Header: 'Action',
                accessor: 'action',
                width: 100,
              },
              {
                Header: 'Cron Expression',
                accessor: 'cron',
                width: 100,
              },
              {
                Header: 'Active',
                accessor: 'is_enabled',
                Cell: cell => (
                  <div>
                    {cell.value === true ? 'Active' : 'Inactive'}
                  </div>
                ),
                width: 80,
              },
              {
                Header: 'Nodes',
                style: { whiteSpace: 'unset' },
                accessor: 'node_names',
                Cell: row => (
                  <span title={`${row.value}`}>
                    {row.value}
                  </span>
                ),
                width: 160,
              },
              {
                Header: 'Status',
                accessor: 'status',
                Cell: cell => (
                  <div>
                    {cell.value}
                  </div>
                ),
              },
            ]}
            getRowStyle={(rowInfo) => (
              {
                opacity: rowInfo?.original.is_enabled ? 1 : 0.5,
              }
            )}
            multiSelectOptions={{
              actions: [
                {
                  name: 'Disable',
                  userRole: 'admin',
                  icon: (<i className="fa fa-eye-slash red cursor" />),
                  onClick: (selectedDocIndex) => {
                    const params = {
                      action: 'disable',
                      scheduled_task_id_list: Object.keys(selectedDocIndex),
                    };
                    return this.updateTasks(params);
                  },
                  postClickSuccess: this.getScheduledJobs,
                  showConfirmationDialog: true,
                  confirmationDialogParams: {
                    dialogTitle: 'Disabled these records?',
                    dialogBody: 'Are you sure you want to disable the selected records?',
                    confirmButtonText: 'Yes, Disable',
                    cancelButtonText: 'No, Keep',
                    contentStyles: {
                      height: '230px',
                    },
                  },
                },
                {
                  name: 'Enable',
                  userRole: 'admin',
                  icon: (<i className="fa fa-eye cursor" />),
                  onClick: (selectedDocIndex) => {
                    const params = {
                      action: 'enable',
                      scheduled_task_id_list: Object.keys(selectedDocIndex),
                    };
                    return this.updateTasks(params);
                  },
                  postClickSuccess: this.getScheduledJobs,
                  showConfirmationDialog: true,
                  confirmationDialogParams: {
                    dialogTitle: 'Enable these records?',
                    dialogBody: 'Are you sure you want to enable the selected records?',
                    confirmButtonText: 'Yes, Enable',
                    cancelButtonText: 'No, Keep',
                  },
                },
                {
                  name: 'Delete',
                  userRole: 'admin',
                  icon: (<i className="fa fa-trash-o red cursor" />),
                  onClick: (selectedDocIndex) => {
                    const params = {
                      action: 'delete',
                      scheduled_task_id_list: Object.keys(selectedDocIndex),
                    };
                    return this.updateTasks(params);
                  },
                  postClickSuccess: this.getScheduledJobs,
                  showConfirmationDialog: true,
                  confirmationDialogParams: {
                    dialogTitle: 'Delete these records?',
                    dialogBody: 'Are you sure you want to Delete the selected records?',
                    confirmButtonText: 'Yes, Delete',
                    cancelButtonText: 'No, Keep',
                  },
                },
              ],
              columnConfig: {
                accessor: 'id'
              }
            }}
          />
        </div>
      </div>
    );
  }
}

const mapStateToProps = state => ({
  tasks: state.getIn(['scheduledTasks', 'data']),
});

export default connect(mapStateToProps, {
  getScheduledTasksAction,
  updateScheduledTasksAction,
})(ScheduledJobs);
