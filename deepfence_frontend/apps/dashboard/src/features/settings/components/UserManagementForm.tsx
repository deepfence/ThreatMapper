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
  Table,
  TextInput,
} from 'ui-components';

import { getUserApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';

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
    apiArgs: [],
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
  company,
  firstName,
  lastName,
  email,
}: ActionFunctionArgs & {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
}): Promise<ActionReturnType> => {
  const r = await makeRequest({
    apiFunction: getUserApiClient().updateCurrentUser,
    apiArgs: [
      {
        modelUser: {
          company: company,
          email: email,
          first_name: firstName,
          last_name: lastName,
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

  return { message: 'Action completed successfully' };
};

export const UserManagementForm = ({ loaderData }: { loaderData: LoaderDataType }) => {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
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
                  setCompany(row.row.original.company);
                  setEmail(row.row.original.email);
                  setOpen(true);
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
        <Button size="md" color="primary" className="min-w-fit mx-2 mb-6">
          Change Password
        </Button>
        <Button size="md" color="normal" className="min-w-fit mb-6">
          Send Invite
        </Button>
      </div>
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
      <Modal open={open} onOpenChange={() => setOpen(false)}>
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
              <span className="w-2/4">Company</span>
              <TextInput value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="flex my-4">
              <span className="w-2/4">Email</span>
              <TextInput value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Button
                size="md"
                color="primary"
                className="w-full mb-4"
                onClick={() => {
                  handleSaveChanges({
                    company,
                    firstName,
                    lastName,
                    email,
                  } as ActionFunctionArgs & {
                    company: string;
                    firstName: string;
                    lastName: string;
                    email: string;
                  });
                  setOpen(false);
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
