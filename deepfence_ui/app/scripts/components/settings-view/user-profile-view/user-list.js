/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { connect } from 'react-redux';
import {Map} from 'immutable';
import {
  getAllUsersAction,
  deleteUserAction,
  userUpdateAction,
  showModal,
  toaster,
} from '../../../actions/app-actions';
import { DfTableV2 } from '../../common/df-table-v2';
import { getUserRole } from '../../../helpers/auth-helper';
import NotificationToaster from '../../common/notification-toaster/notification-toaster';
import UserForm from './user-form';


class UserList extends React.PureComponent {
  constructor(props) {
    super(props);
    this.handleDeleteDialog = this.handleDeleteDialog.bind(this);
    this.deleteUser = this.deleteUser.bind(this);
    this.getAllUsers = this.getAllUsers.bind(this);
    this.handleEditUser = this.handleEditUser.bind(this);
    this.renderUserModalContent = this.renderUserModalContent.bind(this);
    this.saveUser = this.saveUser.bind(this);
  }

  componentDidMount() {
    this.getAllUsers();
  }

  UNSAFE_componentWillReceiveProps(newProps) {
    const {deleteError: newDeleteError} = newProps;
    const {dispatch, deleteError: oldDeleteError = Map()} = this.props;
    if (newDeleteError && newDeleteError.get('timestamp') !== oldDeleteError.get('timestamp')) {
      dispatch(toaster(newDeleteError.get('message')));
    }
  }

  saveUser(valuesIm) {
    const {
      dispatch
    } = this.props;
    const values = valuesIm.toJS();
    const modifiedValues = Object.keys(values).reduce((acc, key) => {
      const value = values[key];
      acc[key] = value.value !== undefined ? value.value : value;
      return acc;
    }, {});
    return dispatch(userUpdateAction(modifiedValues)).then(() => {
      this.getAllUsers({reload: true});
    });
  }

  renderUserModalContent({userId} = {}) {
    const {
      userList,
    } = this.props;
    const userIndex = userList.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
    const selectedUser = userIndex[userId] || {};
    const initialValues = Map({
      ...selectedUser,
      role: {
        label: selectedUser.role,
        value: selectedUser.role,
      },
      isActive: {
        label: selectedUser.isActive === true ? 'Active' : 'Inactive',
        value: selectedUser.isActive,
      },
      api_key: '',
    });

    return (
      <div>
        <UserForm
          userId={userId}
          initialValues={initialValues}
          onSubmit={this.saveUser}
        />
      </div>
    );
  }

  handleEditUser(userId) {
    const modalProps = {
      title: 'User Profile',
      modalContent: this.renderUserModalContent,
      modalContentProps: {
        userId,
      },
      contentStyles: {
        width: '400px',
        height: '300px',
      },
    };
    this.props.dispatch(showModal('GENERIC_MODAL', modalProps));
  }

  getAllUsers({reload} = {}) {
    const {dispatch} = this.props;
    dispatch(getAllUsersAction()).then((response) => {
      if (reload && response.msg === 'Token has been revoked') {
        window.location.reload(false);
      }
    });
  }

  deleteUser(userId) {
    const params = {
      userId,
    };
    return this.props.dispatch(deleteUserAction(params));
  }

  handleDeleteDialog(userId) {
    const params = {
      dialogTitle: 'Delete user?',
      dialogBody: 'Are you sure you want to delete? Deleting a user will delete all policies and rules created by the user.',
      confirmButtonText: 'Yes, delete user',
      cancelButtonText: 'No, keep user',
      onConfirmButtonClick: () => this.deleteUser(userId),
    };
    this.props.dispatch(showModal('DIALOG_MODAL', params));
  }

  render() {
    const {
      userList = [],
      isToasterVisible,
    } = this.props;
    const style = {
      fontSize: '25px',
      padding: '10px',
      color: 'white',
      marginLeft: '27px'
    };
    const userRole = getUserRole();
    const sumOfAgentCounts = userList
      .reduce((sum, arr) => sum + arr.count_of_hosts, 0);
    console.log('userList', userList);
    return (
      <div>
        <div style={style}>User Accounts</div>
        <DfTableV2
        data={userList}
        columns={[
          {
            Header: 'First Name',
            accessor: 'first_name',
          },
          {
            Header: 'Last Name',
            accessor: 'last_name',
          },
          {
            Header: 'Email',
            accessor: 'email',
          },
          {
            Header: 'Agent Count',
            accessor: 'count_of_hosts',
            show: sumOfAgentCounts !== 0,
          },
          {
            Header: 'Role',
            accessor: 'role',
          },
          {
            Header: 'Action',
            accessor: 'id',
            Cell: row => (
              <div
                className="action-control"
              >
                <i
                  className="fa fa-pencil"
                  style={{cursor: 'pointer', marginRight: '10px'}}
                  onClick={() => this.handleEditUser(row.value)}
                  aria-hidden="true"
                />
                {userRole === 'admin' && (
                <i
                  className="fa fa-trash-o"
                  style={{color: 'red', cursor: 'pointer'}}
                  onClick={() => this.handleDeleteDialog(row.value)}
                  aria-hidden="true"
                />
                )}
              </div>
            ),
            style: {textAlign: 'left'},
            sortable: false,
          }
        ]}
         />
        { isToasterVisible && <NotificationToaster /> }
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    userList: state.get('user_list'),
    deleteError: state.getIn(['user_delete_response', 'error']),
    isToasterVisible: state.get('isToasterVisible'),
  };
}

export default connect(
  mapStateToProps
)(UserList);
