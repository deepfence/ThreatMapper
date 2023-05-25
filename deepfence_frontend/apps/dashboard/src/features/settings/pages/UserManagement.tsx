import cx from 'classnames';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaPencilAlt, FaTrashAlt, FaUserPlus } from 'react-icons/fa';
import {
  HiDotsVertical,
  HiOutlineExclamationCircle,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineKey,
  HiOutlineMail,
  HiOutlineSupport,
  HiOutlineUser,
  HiUsers,
} from 'react-icons/hi';
import { ActionFunctionArgs, useFetcher, useLoaderData } from 'react-router-dom';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  Modal,
  Select,
  SelectItem,
  Table,
  TableSkeleton,
  TextInput,
} from 'ui-components';

import { getUserApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelInviteUserRequestActionEnum,
  ModelUpdateUserIdRequestRoleEnum,
} from '@/api/generated';
import { ModelUser } from '@/api/generated/models/ModelUser';
import { CopyToClipboard } from '@/components/CopyToClipboard';
import { useGetApiToken } from '@/features/common/data-component/getApiTokenApiLoader';
import { useGetCurrentUser } from '@/features/common/data-component/getUserApiLoader';
import { ChangePassword } from '@/features/settings/components/ChangePassword';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { ApiError, apiWrapper, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

type LoaderDataType = {
  message?: string;
  data?: ModelUser[];
};
const getUsers = async (): Promise<LoaderDataType> => {
  const getUsers = apiWrapper({ fn: getUserApiClient().getUsers });
  const users = await getUsers();

  if (!users.ok) {
    if (users.error.response?.status === 403) {
      return {
        message: 'You do not have enough permissions to view users',
      };
    }
    throw users.error;
  }

  return {
    data: users.value,
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
    email?: string;
    role?: string;
    firstName?: string;
    lastName?: string;
    status?: string;
  };
  success: boolean;
  invite_url?: string;
  invite_expiry_hours?: number;
  successMessage?: string;
};

export enum ActionEnumType {
  DELETE = 'delete',
  CHANGE_PASSWORD = 'changePassword',
  INVITE_USER = 'inviteUser',
  EDIT_USER = 'editUser',
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
    return {
      success: true,
    };
  } else if (_actionType === ActionEnumType.INVITE_USER) {
    const body = Object.fromEntries(formData);
    const role = body.role as keyof typeof ModelUpdateUserIdRequestRoleEnum;
    const _role: ModelUpdateUserIdRequestRoleEnum =
      ModelUpdateUserIdRequestRoleEnum[role];

    const r = await makeRequest({
      apiFunction: getUserApiClient().inviteUser,
      apiArgs: [
        {
          modelInviteUserRequest: {
            action: body.intent as ModelInviteUserRequestActionEnum,
            email: body.email as string,
            role: _role,
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
              email: modelResponse.error_fields?.email as string,
              role: modelResponse.error_fields?.role as string,
            },
            success: false,
          });
        } else if (r.status === 403) {
          return error.set({
            message: 'You do not have enough permissions to invite user',
            success: false,
          });
        }
      },
    });

    if (ApiError.isApiError(r)) {
      return r.value();
    }
    if (body.intent == ModelInviteUserRequestActionEnum.GetInviteLink) {
      r.invite_url && navigator.clipboard.writeText(r.invite_url);
      toast.success('User invite URL copied !');
      return { ...r, success: true };
    } else if (body.intent === ModelInviteUserRequestActionEnum.SendInviteEmail) {
      return { successMessage: 'User invite sent successfully', success: true };
    }

    return {
      success: true,
    };
  } else if (_actionType === ActionEnumType.EDIT_USER) {
    const body = Object.fromEntries(formData);

    const role = body.role as keyof typeof ModelUpdateUserIdRequestRoleEnum;
    const _role: ModelUpdateUserIdRequestRoleEnum =
      ModelUpdateUserIdRequestRoleEnum[role];

    const r = await makeRequest({
      apiFunction: getUserApiClient().updateUser,
      apiArgs: [
        {
          id: Number(body.id),
          modelUpdateUserIdRequest: {
            first_name: body.firstName as string,
            last_name: body.lastName as string,
            role: _role,
            is_active: body.status === 'Active',
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
              firstName: modelResponse.error_fields?.first_name as string,
              lastName: modelResponse.error_fields?.last_name as string,
              status: modelResponse.error_fields?.is_active as string,
              role: modelResponse.error_fields?.role as string,
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
    return {
      success: true,
    };
  }
  return {
    success: false,
  };
};
const ActionDropdown = ({ user }: { user: ModelUser }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditUserForm, setShowEditUserForm] = useState(false);

  return (
    <>
      {showDeleteDialog && user.id && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          userId={user.id}
          setShowDialog={setShowDeleteDialog}
        />
      )}
      {showEditUserForm && (
        <EditUserModal
          showDialog={showEditUserForm}
          user={user}
          setShowDialog={setShowEditUserForm}
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
                setShowEditUserForm(true);
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
      <ChangePassword />
    </Modal>
  );
};
const InviteUserModal = ({
  showDialog,
  setShowDialog,
}: {
  showDialog: boolean;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionReturnType>();
  const { data, state } = fetcher;

  return (
    <Modal
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title="Invite User"
    >
      {data?.success && data?.successMessage ? (
        <SuccessModalContent text={data?.successMessage}>
          {data?.invite_url && (
            <p
              className={`mb-4 font-normal text-center text-sm text-green-500  w-[260px]`}
            >
              {data?.invite_url} , invite will expire after {data?.invite_expiry_hours}{' '}
              hours
            </p>
          )}
        </SuccessModalContent>
      ) : (
        <fetcher.Form
          method="post"
          className="flex flex-col gap-y-3 mt-2 mb-8 mx-8 w-[260px]"
        >
          <TextInput
            label="Email"
            type={'email'}
            placeholder="Email"
            name="email"
            color={data?.fieldErrors?.email ? 'error' : 'default'}
            sizing="sm"
            required
            helperText={data?.fieldErrors?.email}
          />
          <Select
            noPortal
            name="role"
            label={'Role'}
            placeholder="Role"
            sizing="xs"
            helperText={data?.fieldErrors?.role}
          >
            {Object.keys(ModelUpdateUserIdRequestRoleEnum).map((role) => {
              return (
                <SelectItem value={role} key={role}>
                  {role}
                </SelectItem>
              );
            })}
          </Select>
          <div className={`text-red-600 dark:text-red-500 text-sm`}>
            {!data?.success && data?.message && <span>{data.message}</span>}
          </div>
          <Button
            color="primary"
            size="sm"
            type="submit"
            name="intent"
            value={ModelInviteUserRequestActionEnum['SendInviteEmail']}
          >
            Send invite via email
          </Button>

          <input
            type="text"
            name="_actionType"
            hidden
            readOnly
            value={ActionEnumType.INVITE_USER}
          />

          <Button
            outline
            type="submit"
            size="sm"
            name="intent"
            value={ModelInviteUserRequestActionEnum['GetInviteLink']}
          >
            Copy invite link
          </Button>
          {data?.invite_url && (
            <p className={`mt-1.5 font-normal text-center text-sm text-green-500`}>
              Invite URL: {data?.invite_url}, invite will expire after{' '}
              {data?.invite_expiry_hours} hours
            </p>
          )}
        </fetcher.Form>
      )}
    </Modal>
  );
};

const EditUserModal = ({
  showDialog,
  user,
  setShowDialog,
}: {
  showDialog: boolean;
  user: ModelUser;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionReturnType>();
  const { data } = fetcher;

  const role = Object.entries(ModelUpdateUserIdRequestRoleEnum).find(
    ([_, val]) => val === user.role,
  )?.[0];

  return (
    <Modal
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title="Update User"
    >
      {!data?.success ? (
        <fetcher.Form
          method="post"
          className="flex flex-col gap-y-3 mt-2 mb-8 mx-8 w-[260px]"
        >
          <input readOnly type="hidden" name="id" value={user?.id} />
          <input
            readOnly
            type="hidden"
            name="_actionType"
            value={ActionEnumType.EDIT_USER}
          />
          <TextInput
            label="First Name"
            type={'text'}
            placeholder="First Name"
            name="firstName"
            color={data?.fieldErrors?.firstName ? 'error' : 'default'}
            sizing="sm"
            defaultValue={user?.first_name}
            helperText={data?.fieldErrors?.firstName}
            required
          />
          <TextInput
            label="Last Name"
            type={'text'}
            placeholder="Last Name"
            name="lastName"
            sizing="sm"
            color={data?.fieldErrors?.lastName ? 'error' : 'default'}
            defaultValue={user?.last_name}
            helperText={data?.fieldErrors?.lastName}
            required
          />
          <Select
            noPortal
            defaultValue={role}
            name="role"
            label={'Role'}
            placeholder="Role"
            sizing="xs"
            helperText={data?.fieldErrors?.role}
          >
            {Object.keys(ModelUpdateUserIdRequestRoleEnum).map((role) => {
              return (
                <SelectItem value={role} key={role}>
                  {role}
                </SelectItem>
              );
            })}
          </Select>
          <Select
            noPortal
            name="status"
            label={'Status'}
            placeholder="Active"
            sizing="xs"
            defaultValue={user?.is_active ? 'Active' : 'inActive'}
            helperText={data?.fieldErrors?.status}
          >
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="InActive">InActive</SelectItem>
          </Select>
          <div className={`text-red-600 dark:text-red-500 text-sm`}>
            {!data?.success && data?.message && <span>{data.message}</span>}
          </div>
          <Button color="primary" type="submit" size="sm">
            Update
          </Button>
        </fetcher.Form>
      ) : (
        <SuccessModalContent text="User details successfully updated!" />
      )}
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
    <div className="text-gray-600 dark:text-white rounded-lg w-full">
      <ChangePasswordModal
        showDialog={openChangePasswordForm}
        setShowDialog={setOpenChangePasswordForm}
      />

      {currentUserStatus !== 'idle' && !data ? (
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
              <IconContext.Provider
                value={{
                  className: 'w-4 h-4',
                }}
              >
                <HiOutlineMail />
              </IconContext.Provider>
              Email
            </span>
            <span className="text-sm dark:text-gray-100 font-semibold">
              {currentUserData?.email || '-'}
            </span>
          </div>
          <div className="flex my-3">
            <span className="text-sm text-gray-500 flex items-center gap-x-1 min-w-[140px] dark:text-gray-400">
              <IconContext.Provider
                value={{
                  className: 'w-4 h-4',
                }}
              >
                <HiOutlineSupport />
              </IconContext.Provider>
              Company
            </span>
            <span className="text-sm dark:text-gray-100 font-semibold">
              {currentUserData?.company || '-'}
            </span>
          </div>
          <div className="flex my-3">
            <span className="text-sm text-gray-500 flex items-center gap-x-1 min-w-[140px] dark:text-gray-400">
              <IconContext.Provider
                value={{
                  className: 'w-4 h-4',
                }}
              >
                <HiOutlineUser />
              </IconContext.Provider>
              Role
            </span>
            <span className="text-sm dark:text-gray-100 font-semibold">
              {currentUserData?.role || '-'}
            </span>
          </div>
          <div className="flex my-3">
            <span className="text-sm text-gray-500 flex items-center gap-x-1 min-w-[140px] dark:text-gray-400">
              <IconContext.Provider
                value={{
                  className: 'w-4 h-4',
                }}
              >
                <HiOutlineKey />
              </IconContext.Provider>
              Api key
            </span>
            <div className="text-sm dark:text-gray-100 font-semibold flex gap-x-2">
              <span className="font-mono">
                {showApikey
                  ? data?.api_token || '-'
                  : '************************************'}
              </span>
              <div className="flex items-center ml-2">
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
  const [openInviteUserForm, setOpenInviteUserForm] = useState(false);
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
          return <ActionDropdown user={cell.row.original} />;
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
      <div className="h-full mt-2">
        <APITokenComponent />
        {openInviteUserForm && (
          <InviteUserModal
            showDialog={openInviteUserForm}
            setShowDialog={setOpenInviteUserForm}
          />
        )}
        <div className="mt-4">
          <div className="flex justify-between">
            <div>
              <div className="mt-2 flex gap-x-2 items-center">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 bg-opacity-75 dark:bg-opacity-50 flex items-center justify-center rounded-sm">
                  <IconContext.Provider
                    value={{
                      className: 'text-blue-600 dark:text-blue-400',
                    }}
                  >
                    <HiUsers />
                  </IconContext.Provider>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white text-base">
                  User Accounts
                </h3>
              </div>
            </div>
            <Button
              size="xs"
              color="primary"
              startIcon={<FaUserPlus />}
              type="button"
              className="self-start"
              onClick={() => setOpenInviteUserForm(true)}
            >
              Invite User
            </Button>
          </div>
          <Suspense
            fallback={<TableSkeleton columns={6} rows={5} size={'sm'} className="mt-4" />}
          >
            <DFAwait resolve={loaderData.data}>
              {(resolvedData: LoaderDataType) => {
                const { data, message } = resolvedData;
                const users = data ?? [];

                return (
                  <div className="mt-4">
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
  userId: number;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher();

  const onDeleteAction = useCallback(() => {
    const formData = new FormData();
    formData.append('_actionType', ActionEnumType.DELETE);
    formData.append('userId', userId.toString());
    fetcher.submit(formData, {
      method: 'post',
    });
  }, [userId, fetcher]);
  return (
    <Modal open={showDialog} onOpenChange={() => setShowDialog(false)}>
      {!fetcher?.data?.success ? (
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
          {fetcher.data?.message && (
            <p className="text-sm text-red-500 pt-2">{fetcher.data?.message}</p>
          )}
          <div className="flex items-center justify-right gap-4">
            <Button size="xs" onClick={() => setShowDialog(false)} type="button" outline>
              No, Cancel
            </Button>
            <Button
              size="xs"
              color="danger"
              onClick={(e) => {
                e.preventDefault();
                onDeleteAction();
              }}
            >
              Yes, I&apos;m sure
            </Button>
          </div>
        </div>
      ) : (
        <SuccessModalContent text="User details successfully updated!" />
      )}
    </Modal>
  );
};
