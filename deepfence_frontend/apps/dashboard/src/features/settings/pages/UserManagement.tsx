import { Suspense, useCallback, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { HiDotsVertical, HiOutlineExclamationCircle } from 'react-icons/hi';
import {
  ActionFunctionArgs,
  generatePath,
  Link,
  useFetcher,
  useLoaderData,
} from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  Modal,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getUserApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ModelUser } from '@/api/generated/models/ModelUser';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { usePageNavigation } from '@/utils/usePageNavigation';

type LoaderDataType = {
  message?: string;
  data?: ModelUser[];
};
const getUsers = async (): Promise<LoaderDataType> => {
  const usersPromise = await makeRequest({
    apiFunction: getUserApiClient().getUsers,
    apiArgs: [],
  });

  if (ApiError.isApiError(usersPromise)) {
    return {
      message: 'Error in getting users list',
    };
  }

  return {
    data: usersPromise,
  };
};
const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getUsers(),
  });
};

export type ActionReturnType = {
  message?: string;
  success: boolean;
};

export const action = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const id = Number(formData.get('userId'));
  const r = await makeRequest({
    apiFunction: getUserApiClient().deleteUser,
    apiArgs: [
      {
        id,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ActionReturnType>({ success: false });
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
          success: false,
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }

  toast('User account deleted sucessfully');
  return {
    success: true,
  };
};
const ActionDropdown = ({ id }: { id: string }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { navigate } = usePageNavigation();

  return (
    <>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          userId={id}
          setShowDialog={setShowDeleteDialog}
        />
      )}
      <Dropdown
        triggerAsChild={true}
        align="end"
        content={
          <>
            <DropdownItem
              className="text-sm"
              onClick={() => {
                navigate(
                  generatePath('/settings/user-management/edit/:userId', {
                    userId: id,
                  }),
                );
              }}
            >
              <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
                <IconContext.Provider
                  value={{ className: 'text-gray-700 dark:text-gray-400' }}
                >
                  <FaPencilAlt />
                </IconContext.Provider>
                Edit
              </span>
            </DropdownItem>
            <DropdownItem
              className="text-sm"
              onClick={() => {
                setShowDeleteDialog(true);
              }}
            >
              <span className="flex items-center gap-x-2 text-red-700 dark:text-red-400">
                <IconContext.Provider
                  value={{ className: 'text-red-700 dark:text-red-400' }}
                >
                  <FaTrashAlt className="text-red-500" />
                </IconContext.Provider>
                Delete
              </span>
            </DropdownItem>
          </>
        }
      >
        <Button size="xs" color="normal" className="hover:bg-transparent">
          <IconContext.Provider value={{ className: 'text-gray-700 dark:text-gray-400' }}>
            <HiDotsVertical />
          </IconContext.Provider>
        </Button>
      </Dropdown>
    </>
  );
};
const UserManagement = () => {
  const columnHelper = createColumnHelper<ModelUser>();
  const loaderData = useLoaderData() as LoaderDataType;
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('id', {
        cell: (cell) => cell.getValue(),
        header: () => 'ID',
        minSize: 30,
        size: 30,
        maxSize: 85,
      }),
      columnHelper.accessor('first_name', {
        cell: (cell) => cell.getValue(),
        header: () => 'First Name',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('last_name', {
        cell: (cell) => cell.getValue(),
        header: () => 'Last Name',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('email', {
        cell: (cell) => cell.getValue(),
        header: () => 'Email',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('role', {
        cell: (cell) => cell.getValue(),
        header: () => 'Role',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          if (!cell.row.original.id) {
            throw new Error('Registry Account node id not found');
          }
          return <ActionDropdown id={cell.row.original.id.toString()} />;
        },
        header: () => '',
        minSize: 20,
        size: 20,
        maxSize: 20,
        enableResizing: false,
      }),
    ];
    return columns;
  }, []);

  return (
    <SettingsTab value="user-management">
      <div className="h-full mt-2 p-2">
        <Suspense fallback={<TableSkeleton columns={6} rows={5} size={'sm'} />}>
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType) => {
              const { data, message } = resolvedData;
              const users = data ?? [];

              return (
                <div>
                  <div className="flex justify-between m-2">
                    <h3 className="py-2 font-medium text-gray-900 dark:text-white uppercase text-sm tracking-wider">
                      User Accounts
                    </h3>
                    <div className="flex justify-end gap-2">
                      <Link to="/settings/user-management/change-password">
                        <Button color="primary" size="sm">
                          Change Password
                        </Button>
                      </Link>
                      <Link to="/settings/user-management/invite-user">
                        <Button color="primary" size="sm">
                          Invite User
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {message ? (
                    <p className="text-red-500 text-sm">{message}</p>
                  ) : (
                    <Table
                      size="sm"
                      data={users}
                      columns={columns}
                      enablePagination
                      pageSize={5}
                      enableColumnResizing
                      enableSorting
                    />
                  )}
                </div>
              );
            }}
          </DFAwait>
        </Suspense>
      </div>
    </SettingsTab>
  );
};

export const module = {
  element: <UserManagement />,
  loader,
  action,
};

const DeleteConfirmationModal = ({
  showDialog,
  userId,
  setShowDialog,
}: {
  showDialog: boolean;
  userId: string;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher();

  const onDeleteAction = useCallback(() => {
    const formData = new FormData();
    formData.append('userId', userId);
    fetcher.submit(formData, {
      method: 'post',
    });
  }, [userId, fetcher]);

  return (
    <Modal open={showDialog} onOpenChange={() => setShowDialog(false)}>
      <div className="grid place-items-center p-6">
        <IconContext.Provider
          value={{
            className: 'mb-3 dark:text-red-600 text-red-400 w-[70px] h-[70px]',
          }}
        >
          <HiOutlineExclamationCircle />
        </IconContext.Provider>
        <h3 className="mb-4 font-normal text-center text-sm">
          Selected user will be deleted.
          <br />
          <span>Are you sure you want to delete?</span>
        </h3>
        <div className="flex items-center justify-right gap-4">
          <Button size="xs" onClick={() => setShowDialog(false)}>
            No, cancel
          </Button>
          <Button
            size="xs"
            color="danger"
            onClick={() => {
              onDeleteAction();
              setShowDialog(false);
            }}
          >
            Yes, I&apos;m sure
          </Button>
        </div>
      </div>
    </Modal>
  );
};
