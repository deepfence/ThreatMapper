import React from 'react';
import {connect} from 'react-redux';
import {dateTimeFormat} from '../../../utils/time-utils';
import { DfTableV2 } from '../../common/df-table-v2';
import {
  getScheduledTasksAction,
  updateScheduledTasksAction,
} from '../../../actions/app-actions';
import withMultiSelectColumn from '../../common/df-table/with-multi-select-column';

class ScheduledJobs extends React.Component {
  constructor(props) {
    super(props);
    this.getScheduledJobs = this.getScheduledJobs.bind(this);
  }

  componentDidMount() {
    this.getScheduledJobs();
    const {
      registerActions,
    } = this.props;

    const actionList = [
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
    ];
    registerActions(actionList);
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
      multiSelectColumn,
    } = this.props;
    return (
      <div>
        <div className="scheduled-job-padding">
          <DfTableV2
          data={tasks}
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
              Header: 'Node Type',
              accessor: 'node_type',
              maxWidth: 150,
            },
            {
              Header: 'Action',
              accessor: 'action',
              maxWidth: 250,
            },
            {
              Header: 'Cron Expression',
              accessor: 'cron',
              maxWidth: 150,
            },
            {
              Header: 'Active',
              accessor: 'is_enabled',
              Cell: cell => (
                <div>
                  {cell.value === true ? 'Active' : 'Inactive'}
                </div>
              ),
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
              minWidth: 200,
            },
            {
              Header: 'Status',
              accessor: 'status',
              Cell: cell => (
                <div>
                  {cell.value}
                </div>
              ),
              minWidth: 200,
            },
            multiSelectColumn,
          ]}
          getTrProps={(state, rowInfo) => (
            {
              style: {
                opacity: rowInfo?.original.is_enabled ? 1 : 0.5,
              },
            }
          )}
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
})(withMultiSelectColumn({
  name: 'schedule-tasks',
  column: {
    name: 'Action',
    accessor: 'id',
  },
})(ScheduledJobs));
