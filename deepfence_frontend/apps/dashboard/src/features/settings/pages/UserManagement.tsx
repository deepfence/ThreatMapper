import cx from 'classnames';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaPencilAlt, FaTrashAlt, FaUserPlus } from 'react-icons/fa';
import {
  HiDotsVertical,
  HiKey,
  HiOutlineExclamationCircle,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineMail,
  HiOutlineSupport,
  HiUser,
} from 'react-icons/hi';
import {
  ActionFunctionArgs,
  generatePath,
  useFetcher,
  useLoaderData,
} from 'react-router-dom';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';
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
import { CopyToClipboard } from '@/components/CopyToClipboard';
import { DFLink } from '@/components/DFLink';
import { useGetApiToken } from '@/features/common/data-component/getApiTokenApiLoader';
import { useGetCurrentUser } from '@/features/common/data-component/getUserApiLoader';
import { ChangePassword } from '@/features/settings/components/ChangePassword';
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
  fieldErrors?: {
    old_password?: string;
    new_password?: string;
    confirm_password?: string;
  };
  success: boolean;
};

export enum ActionEnumType {
  DELETE = 'delete',
  CHANGE_PASSWORD = 'change_password',
}

export const action = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();

  const _actionType = formData.get('_actionType')?.toString();

  if (!_actionType) {
    return {
      message: 'Action Type is required',
      success: false,
    };
  }

  if (_actionType === ActionEnumType.DELETE) {
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
  } else if (_actionType === ActionEnumType.CHANGE_PASSWORD) {
    // add console_url which is the origin of request
    formData.append('consoleUrl', window.location.origin);
    const body = Object.fromEntries(formData);

    if (body.new_password !== body.confirm_password) {
      return {
        message: 'Password does not match',
        success: false,
      };
    }

    const r = await makeRequest({
      apiFunction: getUserApiClient().updatePassword,
      apiArgs: [
        {
          modelUpdateUserPasswordRequest: {
            old_password: body.old_password as string,
            new_password: body.new_password as string,
          },
        },
      ],
      errorHandler: async (r) => {
        const error = new ApiError<ActionReturnType>({
          success: false,
        });
        if (r.status === 400) {
          const modelResponse: ApiDocsBadRequestResponse = await r.json();
          return error.set({
            fieldErrors: {
              old_password: modelResponse.error_fields?.old_password as string,
              new_password: modelResponse.error_fields?.new_password as string,
            },
            success: false,
          });
        } else if (r.status === 403) {
          const modelResponse: ApiDocsBadRequestResponse = await r.json();
          return error.set({
            message: modelResponse.message,
            success: false,
          });
        }
      },
    });

    if (ApiError.isApiError(r)) {
      return r.value();
    }
    toast.success('Password changed successfully');
    return {
      success: true,
    };
  }
  return {
    success: false,
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

const ChangePasswordModal = ({
  showDialog,
  setShowDialog,
}: {
  showDialog: boolean;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <Modal
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title="Change Password"
    >
      <ChangePassword setShowDialog={setShowDialog} />
    </Modal>
  );
};

const APITokenSkeletonComponent = () => {
  return (
    <div className="flex flex-col gap-y-4 animate-pulse min-w-[400px]">
      <div className="h-10 w-72 bg-gray-200 dark:bg-gray-700 py-4 rounded-md"></div>
      <div className="flex gap-x-[140px]">
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        <div className="h-5 w-56 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
      </div>
      <div className="flex gap-x-[140px]">
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        <div className="h-5 w-56 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
      </div>
      <div className="flex gap-x-[140px]">
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        <div className="h-5 w-56 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
      </div>
      <div className="flex gap-x-[140px]">
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        <div className="h-5 w-56 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
      </div>
    </div>
  );
};
const APITokenComponent = () => {
  const { data } = useGetApiToken();
  const { status: currentUserStatus = 'dummy', data: currentUserData } =
    useGetCurrentUser();
  const [showApikey, setShowApiKey] = useState(false);
  const [openChangePasswordForm, setOpenChangePasswordForm] = useState(false);

  return (
    <div className="text-gray-600 dark:text-white rounded-lg w-full p-2">
      <ChangePasswordModal
        showDialog={openChangePasswordForm}
        setShowDialog={setOpenChangePasswordForm}
      />

      {currentUserStatus !== 'idle' ? (
        <APITokenSkeletonComponent />
      ) : (
        <div>
          <div className="flex">
            <div className="flex flex-col">
              <span className="text-2xl dark:text-gray-100 font-semibold">
                {`${currentUserData?.first_name || ''} ${
                  currentUserData?.last_name || ''
                }`}
              </span>
              <span
                className={twMerge(
                  cx(
                    'font-semibold w-fit text-xs rounded-sm dark:text-gray-100 self-start',
                    {
                      'text-green-500 dark:text-green-400': currentUserData?.is_active,
                      'text-gray-700 dark:text-gray-400': !currentUserData?.is_active,
                    },
                  ),
                )}
              >
                {currentUserData?.is_active ? 'Active' : 'InActive'}
              </span>
            </div>
            <Button
              color="primary"
              size="xs"
              className="ml-auto self-start"
              onClick={() => setOpenChangePasswordForm(true)}
            >
              Change Password
            </Button>
          </div>
          <div className="flex mt-4 mb-2">
            <span className="text-sm text-gray-500 flex items-center gap-x-1 min-w-[140px] dark:text-gray-400">
              <HiOutlineMail /> Email
            </span>
            <span className="text-sm dark:text-gray-100 font-semibold">
              {currentUserData?.email || '-'}
            </span>
          </div>
          <div className="flex mb-2">
            <span className="text-sm text-gray-500 flex items-center gap-x-1 min-w-[140px] dark:text-gray-400">
              <HiOutlineSupport /> Company
            </span>
            <span className="text-sm dark:text-gray-100 font-semibold">
              {currentUserData?.company || '-'}
            </span>
          </div>
          <div className="flex mb-2">
            <span className="text-sm text-gray-500 flex items-center gap-x-1 min-w-[140px] dark:text-gray-400">
              <HiUser /> Role
            </span>
            <span className="text-sm dark:text-gray-100 font-semibold">
              {currentUserData?.role || '-'}
            </span>
          </div>
          <div className="flex mb-2">
            <span className="text-sm text-gray-500 flex items-center gap-x-1 min-w-[140px] dark:text-gray-400">
              <HiKey /> Api key
            </span>
            <div className="text-sm dark:text-gray-100 font-semibold flex gap-x-2">
              <span className="bg-gray-100 dark:bg-gray-800 rounded-md font-mono">
                {showApikey
                  ? data?.api_token || '-'
                  : '************************************'}
              </span>
              <div className="flex items-center">
                {!showApikey ? (
                  <IconContext.Provider
                    value={{
                      className: 'w-5 h-5',
                    }}
                  >
                    <HiOutlineEye
                      className="cursor-pointer"
                      onClick={() => {
                        setShowApiKey(true);
                      }}
                    />
                  </IconContext.Provider>
                ) : (
                  <IconContext.Provider
                    value={{
                      className: 'w-5 h-5',
                    }}
                  >
                    <HiOutlineEyeOff
                      className="cursor-pointer"
                      onClick={() => {
                        setShowApiKey(false);
                      }}
                    />
                  </IconContext.Provider>
                )}
                <CopyToClipboard
                  asIcon
                  className="relative top-0 right-0 ml-4"
                  data={data?.api_token || ''}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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
            throw new Error('User id not found');
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
        <APITokenComponent />
        <Suspense fallback={<TableSkeleton columns={6} rows={5} size={'sm'} />}>
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType) => {
              const { data, message } = resolvedData;
              const users = data ?? [];

              return (
                <div className="mt-4">
                  <div className="flex justify-between m-2">
                    <h3 className="py-2 font-medium text-gray-900 dark:text-white uppercase text-sm tracking-wider">
                      User Accounts
                    </h3>
                    <div className="flex justify-end gap-2">
                      <DFLink to="/settings/user-management/invite-user">
                        <Button
                          color="primary"
                          size="xs"
                          outline
                          startIcon={<FaUserPlus />}
                        >
                          Invite User
                        </Button>
                      </DFLink>
                    </div>
                  </div>

                  {message ? (
                    <p className="text-red-500 text-sm">{message}</p>
                  ) : (
                    <Table
                      size="sm"
                      data={users}
                      columns={columns}
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
    formData.append('_actionType', ActionEnumType.DELETE);
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
            No, Cancel
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
