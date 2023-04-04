import { Suspense, useCallback, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaPencilAlt, FaTrashAlt } from 'react-icons/fa';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import {
  ActionFunctionArgs,
  generatePath,
  Link,
  useFetcher,
  useLoaderData,
} from 'react-router-dom';
import { toast } from 'sonner';
import { Button, createColumnHelper, Modal, Table, TableSkeleton } from 'ui-components';

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
const UserManagement = () => {
  const { navigate } = usePageNavigation();
  const columnHelper = createColumnHelper<ModelUser>();
  const loaderData = useLoaderData() as LoaderDataType;
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('id', {
        cell: (cell) => cell.getValue(),
        header: () => 'ID',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('first_name', {
        cell: (cell) => cell.getValue(),
        header: () => 'First Name',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('last_name', {
        cell: (cell) => cell.getValue(),
        header: () => 'Last Name',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('email', {
        cell: (cell) => cell.getValue(),
        header: () => 'Email',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('role', {
        cell: (cell) => cell.getValue(),
        header: () => 'Role',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.display({
        id: 'actions',
        cell: (cell) => {
          if (!cell.row.original.id) {
            throw new Error('User id not found');
          }
          return (
            <span className="flex gap-4">
              <FaPencilAlt
                onClick={() => {
                  navigate(
                    generatePath('/settings/user-management/edit/:userId', {
                      userId: String(cell.row.original.id),
                    }),
                  );
                  console.log('test update', cell.row.original);
                }}
              />
              <FaTrashAlt
                onClick={() => {
                  setShowDeleteDialog(true);
                  setSelectedUserId(String(cell.row.original.id));
                }}
              />
            </span>
          );
        },
        header: () => 'Actions',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
    ];
    return columns;
  }, []);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  return (
    <SettingsTab value="user-management">
      <div className="h-full mt-2 p-2">
        <div className="flex justify-end">
          <Link to="/settings/user-management/change-password">
            <Button color="primary">Change Password</Button>
          </Link>
        </div>
        <Suspense fallback={<TableSkeleton columns={6} rows={5} size={'sm'} />}>
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType) => {
              const { data, message } = resolvedData;
              const users = data ?? [];

              return (
                <div>
                  <h3 className="py-2 font-medium text-gray-900 dark:text-white uppercase text-sm tracking-wider">
                    User Accounts
                  </h3>
                  {selectedUserId && (
                    <DeleteConfirmationModal
                      showDialog={showDeleteDialog}
                      userId={selectedUserId}
                      setShowDialog={setShowDeleteDialog}
                    />
                  )}
                  {message ? (
                    <p className="text-red-500 text-sm">{message}</p>
                  ) : (
                    <Table
                      size="sm"
                      data={users}
                      columns={columns}
                      enablePagination
                      pageSize={5}
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
