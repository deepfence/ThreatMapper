import cx from 'classnames';
import { useState } from 'react';
import { HiDotsHorizontal } from 'react-icons/hi';
import { ActionFunctionArgs } from 'react-router-dom';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  Modal,
  Radio,
  Select,
  SelectItem,
  Table,
  TextInput,
} from 'ui-components';

import { getUserApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { getUsersData } from '@/features/settings/pages/UserManagement';
import { ApiError, makeRequest } from '@/utils/api';

const inviteRole: Array<{
  label: string;
  value: string;
}> = [
  {
    label: 'Admin',
    value: 'admin',
  },
  {
    label: 'User',
    value: 'standard-user',
  },
  {
    label: 'Read only user',
    value: 'read-only-user',
  },
];

export type LoaderDataType = {
  error?: string;
  message?: string;
  data?: object;
};

type ActionReturnType = {
  message?: string;
};

const deleteUser = async (id: number): Promise<void> => {
  const r = await makeRequest({
    apiFunction: getUserApiClient().deleteCurrentUser,
    apiArgs: [{ id: id }],
    errorHandler: async (r) => {
      const error = new ApiError<ActionReturnType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    // Handle the error
  }
};

const handleSaveChanges = async ({
  firstName,
  lastName,
  id,
  active,
  roleInvite,
}: ActionFunctionArgs & {
  firstName: string;
  lastName: string;
  id: number;
  active: string;
  roleInvite: string;
}): Promise<ActionReturnType> => {
  let activeRole;
  if (active === 'true') {
    activeRole = true;
  } else {
    activeRole = false;
  }
  const r = await makeRequest({
    apiFunction: getUserApiClient().updateCurrentUser,
    apiArgs: [
      {
        id: id,
        modelUpdateUserIdRequest: {
          first_name: firstName,
          last_name: lastName,
          is_active: activeRole,
          role: roleInvite,
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ActionReturnType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }

  await getUsersData();

  return { message: 'Action completed successfully' };
};

const handleInviteUser = async ({
  emailInvite,
  roleInvite,
}: ActionFunctionArgs & {
  emailInvite: string;
  roleInvite: string;
}): Promise<ActionReturnType> => {
  const r = await makeRequest({
    apiFunction: getUserApiClient().inviteUser,
    apiArgs: [
      {
        modelInviteUserRequest: {
          action: 'send-invite-email',
          email: emailInvite,
          role: roleInvite,
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ActionReturnType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }

  await getUsersData();

  return { message: 'Action completed successfully' };
};

const handleChangePassword = async ({
  newPassword,
  oldPassword,
}: ActionFunctionArgs & {
  newPassword: string;
  oldPassword: string;
}): Promise<ActionReturnType> => {
  const r = await makeRequest({
    apiFunction: getUserApiClient().updatePassword,
    apiArgs: [
      {
        modelUpdateUserPasswordRequest: {
          new_password: newPassword,
          old_password: oldPassword,
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ActionReturnType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }

  await getUsersData();

  return { message: 'Action completed successfully' };
};

export const UserManagementForm = ({ loaderData }: { loaderData: LoaderDataType }) => {
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openInviteModal, setOpenInviteModal] = useState(false);
  const [openPasswordModal, setOpenPasswordModal] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [id, setId] = useState();
  const [emailInvite, setEmailInvite] = useState('');
  const [roleInvite, setRoleInvite] = useState('admin');
  const [active, setActive] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const tableColumns = [
    {
      accessorKey: 'id',
      size: 100,
    },
    {
      accessorKey: 'first_name',
    },
    {
      accessorKey: 'last_name',
    },
    {
      accessorKey: 'email',
    },
    {
      accessorKey: 'company',
    },
    {
      accessorKey: 'role',
    },
    {
      accessorKey: 'is_active',
      header: () => 'Active',
    },
    {
      cell: (row: any) => (
        <Dropdown
          content={
            <>
              <DropdownItem
                onClick={() => {
                  setFirstName(row.row.original.first_name);
                  setLastName(row.row.original.last_name);
                  setId(row.row.original.id);
                  setOpenEditModal(true);
                }}
              >
                Edit
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                className={`${
                  row.row.original.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''
                } text-red-700 dark:text-red-500`}
                onClick={() => {
                  deleteUser(row.row.original.id);
                }}
              >
                Delete
              </DropdownItem>
            </>
          }
          triggerAsChild
        >
          <Button
            className={cx(
              'text-sm text-left flex items-center gap-5',
              'border-b dark:border-gray-700 border-gray-200 dark:text-gray-300 dark:bg-transparent h-fit',
            )}
          >
            {' '}
            <HiDotsHorizontal />
          </Button>
        </Dropdown>
      ),
      enableResizing: false,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      header: function noRefCheck() {},
      id: 'actions',
      maxSize: 100,
      minSize: 100,
      size: 100,
    },
  ];

  const tableData = Array.isArray(loaderData.data) ? loaderData.data : [];
  return (
    <div>
      <div className="flex flex-row justify-end">
        <Button
          size="md"
          color="primary"
          className="min-w-fit mx-2 mb-6"
          onClick={() => {
            setOpenPasswordModal(true);
          }}
        >
          Change Password
        </Button>
        <Modal open={openPasswordModal} onOpenChange={() => setOpenPasswordModal(false)}>
          <>
            <div>
              <div className="flex my-4">
                <TextInput
                  type={'password'}
                  placeholder="Old Password"
                  sizing="sm"
                  name="password"
                  onChange={(e) => setOldPassword(e.target.value)}
                  value={oldPassword}
                />
              </div>
              <div className="flex my-4">
                <TextInput
                  type={'password'}
                  placeholder="New Password"
                  sizing="sm"
                  name="password"
                  onChange={(e) => setNewPassword(e.target.value)}
                  value={newPassword}
                />
              </div>
              <div className="flex my-4">
                <TextInput
                  type={'password'}
                  placeholder="Confirm New Password"
                  sizing="sm"
                  name="password"
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  value={newPasswordConfirm}
                  color={newPasswordConfirm !== newPassword ? 'error' : 'default'}
                />
              </div>
              <div>
                <Button
                  size="md"
                  color="primary"
                  className="w-full mb-4"
                  onClick={() => {
                    handleChangePassword({
                      newPassword,
                      oldPassword,
                    } as ActionFunctionArgs & {
                      newPassword: string;
                      oldPassword: string;
                    });
                    setOpenPasswordModal(false);
                  }}
                >
                  Change Password
                </Button>
              </div>
            </div>
          </>
        </Modal>
        <Button
          size="md"
          color="normal"
          className="min-w-fit mb-6"
          onClick={() => {
            setOpenInviteModal(true);
          }}
        >
          Send Invite
        </Button>
      </div>
      <Modal open={openInviteModal} onOpenChange={() => setOpenInviteModal(false)}>
        <>
          <div>
            <div className="my-4">
              <TextInput
                value={emailInvite}
                placeholder="Email"
                onChange={(e) => setEmailInvite(e.target.value)}
              />
            </div>
            <div className="my-4">
              <Select
                noPortal
                value={roleInvite}
                name="role"
                onChange={(e) => {
                  setRoleInvite(e);
                }}
                placeholder="Select a role"
                sizing="sm"
              >
                {inviteRole.map((role) => {
                  return (
                    <SelectItem value={role.value} key={role.value}>
                      {role.label}
                    </SelectItem>
                  );
                })}
              </Select>
            </div>
            <div>
              <Button
                size="md"
                color="primary"
                className="w-full mb-4"
                onClick={() => {
                  handleInviteUser({
                    emailInvite,
                    roleInvite,
                  } as ActionFunctionArgs & {
                    emailInvite: string;
                    roleInvite: string;
                  });
                  setOpenInviteModal(false);
                }}
              >
                Send Invite
              </Button>
            </div>
          </div>
        </>
      </Modal>
      <Table
        size="sm"
        columns={tableColumns}
        data={tableData?.map((user) => ({
          id: user.id,
          company: user.company,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          is_active: user.is_active ? 'Active' : 'Inactive',
        }))}
      />
      <Modal open={openEditModal} onOpenChange={() => setOpenEditModal(false)}>
        <>
          <div>
            <div className="flex my-4">
              <span className="w-2/4">First Name</span>
              <TextInput
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="flex my-4">
              <span className="w-2/4">Last Name</span>
              <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="flex my-4">
              <span className="w-2/4">Role</span>
              <div className="w-full">
                <Select
                  noPortal
                  value={roleInvite}
                  name="role"
                  onChange={(e) => {
                    setRoleInvite(e);
                  }}
                  placeholder="Select a role"
                  sizing="sm"
                >
                  {inviteRole.map((role) => {
                    return (
                      <SelectItem value={role.value} key={role.value}>
                        {role.label}
                      </SelectItem>
                    );
                  })}
                </Select>
              </div>
            </div>
            <div className="flex my-4">
              <span className="w-2/4">Active</span>
              <Radio
                direction="row"
                name="active"
                onValueChange={(e) => {
                  setActive(e);
                }}
                options={[
                  {
                    label: 'True',
                    value: 'true',
                  },
                  {
                    label: 'False',
                    value: 'false',
                  },
                ]}
              />
            </div>
            <div>
              <Button
                size="md"
                color="primary"
                className="w-full mb-4"
                onClick={() => {
                  handleSaveChanges({
                    firstName,
                    lastName,
                    id,
                    active,
                    roleInvite,
                  } as unknown as ActionFunctionArgs & {
                    firstName: string;
                    lastName: string;
                    id: number;
                    active: string;
                    roleInvite: string;
                  });
                  setOpenEditModal(false);
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </>
      </Modal>
    </div>
  );
};
