import { useSuspenseQuery } from '@suspensive/react-query';
import { capitalize } from 'lodash-es';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from 'tailwind-preset';
import {
  Button,
  CircleSpinner,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  IconButton,
  Listbox,
  ListboxOption,
  Modal,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
  Table,
  TableSkeleton,
  TextInput,
} from 'ui-components';

import { getUserApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelInviteUserRequestActionEnum,
  ModelUpdateUserIDRequestRoleEnum,
} from '@/api/generated';
import { ModelUser } from '@/api/generated/models/ModelUser';
import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { DFLink } from '@/components/DFLink';
import { CheckIcon } from '@/components/icons/common/Check';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { EyeHideSolid } from '@/components/icons/common/EyeHideSolid';
import { EyeSolidIcon } from '@/components/icons/common/EyeSolid';
import { PlusIcon } from '@/components/icons/common/Plus';
import { RefreshIcon } from '@/components/icons/common/Refresh';
import { SlidingModalHeaderWrapper } from '@/features/common/SlidingModalHeaderWrapper';
import { ChangePassword } from '@/features/settings/components/ChangePassword';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { get403Message, getFieldErrors, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
const DEFAULT_PAGE_SIZE = 10;

export type ActionData = {
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

enum ActionEnumType {
  DELETE = 'delete',
  CHANGE_PASSWORD = 'changePassword',
  INVITE_USER = 'inviteUser',
  EDIT_USER = 'editUser',
  RESET_API_KEY = 'resetAPIKey',
  DELETE_USER = 'delete_user',
}

const useListUsers = () => {
  return useSuspenseQuery({
    ...queries.setting.listUsers(),
  });
};

const useGetCurrentUser = () => {
  return useSuspenseQuery({
    ...queries.auth.currentUser(),
  });
};

const useGetApiToken = () => {
  return useSuspenseQuery({
    ...queries.auth.apiToken(),
  });
};

const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
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
    const deleteApi = apiWrapper({
      fn: getUserApiClient().deleteUser,
    });
    const deleteResponse = await deleteApi({
      id,
    });
    if (!deleteResponse.ok) {
      if (deleteResponse.error.response.status === 400) {
        const { message } = await getResponseErrors(deleteResponse.error);
        return {
          success: false,
          message,
        };
      } else if (deleteResponse.error.response.status === 403) {
        const message = await get403Message(deleteResponse.error);
        return {
          success: false,
          message,
        };
      }
      throw deleteResponse.error;
    }
    invalidateAllQueries();
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

    const updateApi = apiWrapper({
      fn: getUserApiClient().updatePassword,
    });
    const updateResponse = await updateApi({
      modelUpdateUserPasswordRequest: {
        old_password: body.old_password as string,
        new_password: body.new_password as string,
      },
    });
    if (!updateResponse.ok) {
      if (updateResponse.error.response.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse =
          await updateResponse.error.response.json();
        return {
          fieldErrors: {
            old_password: modelResponse.error_fields?.old_password as string,
            new_password: modelResponse.error_fields?.new_password as string,
          },
          success: false,
        };
      } else if (updateResponse.error.response.status === 403) {
        const message = await get403Message(updateResponse.error);
        return {
          success: false,
          message,
        };
      }
      throw updateResponse.error;
    }
    invalidateAllQueries();
  } else if (_actionType === ActionEnumType.INVITE_USER) {
    const body = Object.fromEntries(formData);
    const role = body.role as keyof typeof ModelUpdateUserIDRequestRoleEnum;
    const _role: ModelUpdateUserIDRequestRoleEnum =
      ModelUpdateUserIDRequestRoleEnum[role];

    const inviteApi = apiWrapper({
      fn: getUserApiClient().inviteUser,
    });
    const inviteResponse = await inviteApi({
      modelInviteUserRequest: {
        action: body.intent as ModelInviteUserRequestActionEnum,
        email: body.email as string,
        role: _role,
      },
    });
    if (!inviteResponse.ok) {
      if (inviteResponse.error.response.status === 400) {
        const fieldErrors = await getFieldErrors(inviteResponse.error);
        return {
          success: false,
          fieldErrors: {
            email: fieldErrors?.email,
            role: fieldErrors?.role,
          },
        };
      } else if (inviteResponse.error.response.status === 403) {
        const message = await get403Message(inviteResponse.error);
        return {
          success: false,
          message,
        };
      }
      throw inviteResponse.error;
    }
    invalidateAllQueries();
    if (body.intent == ModelInviteUserRequestActionEnum.GetInviteLink) {
      inviteResponse.value.invite_url &&
        navigator.clipboard.writeText(inviteResponse.value.invite_url);
      toast.message('User invite URL copied !');
      return {
        ...inviteResponse.value,
        success: true,
      };
    } else if (body.intent === ModelInviteUserRequestActionEnum.SendInviteEmail) {
      return {
        successMessage: 'User invite sent successfully',
        success: true,
      };
    }
  } else if (_actionType === ActionEnumType.EDIT_USER) {
    const body = Object.fromEntries(formData);

    const role = body.role as keyof typeof ModelUpdateUserIDRequestRoleEnum;
    const _role: ModelUpdateUserIDRequestRoleEnum =
      ModelUpdateUserIDRequestRoleEnum[role];

    const updateApi = apiWrapper({
      fn: getUserApiClient().updateUser,
    });
    const updateResponse = await updateApi({
      id: Number(body.id),
      modelUpdateUserIDRequest: {
        first_name: body.firstName as string,
        last_name: body.lastName as string,
        role: _role,
        is_active: body.status === 'Active',
      },
    });
    if (!updateResponse.ok) {
      if (updateResponse.error.response.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse =
          await updateResponse.error.response.json();
        return {
          fieldErrors: {
            firstName: modelResponse.error_fields?.first_name as string,
            lastName: modelResponse.error_fields?.last_name as string,
            status: modelResponse.error_fields?.is_active as string,
            role: modelResponse.error_fields?.role as string,
          },
          success: false,
        };
      } else if (updateResponse.error.response.status === 403) {
        const message = await get403Message(updateResponse.error);
        return {
          success: false,
          message,
        };
      }
      throw updateResponse.error;
    }
    invalidateAllQueries();
  } else if (_actionType === ActionEnumType.RESET_API_KEY) {
    const resetApiTokens = apiWrapper({
      fn: getUserApiClient().resetApiTokens,
    });
    const resetApiTokensResponse = await resetApiTokens();
    if (!resetApiTokensResponse.ok) {
      if (resetApiTokensResponse.error.response.status === 403) {
        const message = await get403Message(resetApiTokensResponse.error);
        return {
          success: false,
          message,
        };
      }
      throw resetApiTokensResponse.error;
    }
    invalidateAllQueries();
  }
  return {
    success: true,
  };
};

const ActionDropdown = ({
  user,
  trigger,
  onTableAction,
}: {
  user: ModelUser;
  trigger: React.ReactNode;
  onTableAction: (row: ModelUser, action: ActionEnumType) => void;
}) => {
  return (
    <>
      <Dropdown
        triggerAsChild={true}
        align="start"
        content={
          <>
            <DropdownItem
              onClick={() => {
                onTableAction(user, ActionEnumType.EDIT_USER);
              }}
            >
              Edit
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                onTableAction(user, ActionEnumType.DELETE_USER);
              }}
              color="error"
            >
              Delete
            </DropdownItem>
          </>
        }
      >
        {trigger}
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
    <SlidingModal size="s" open={showDialog} onOpenChange={() => setShowDialog(false)}>
      <SlidingModalHeader>
        <SlidingModalHeaderWrapper>Change your password</SlidingModalHeaderWrapper>
      </SlidingModalHeader>
      <SlidingModalCloseButton />
      <SlidingModalContent>
        <ChangePassword onCancel={() => setShowDialog(false)} />
      </SlidingModalContent>
    </SlidingModal>
  );
};
const CopyField = ({ value }: { value: string }) => {
  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <div className="absolute right-0 top-0 group-hover:block">
      {isCopied ? (
        <IconButton size="sm" variant="flat" color="success" icon={<CheckIcon />} />
      ) : (
        <IconButton
          size="sm"
          variant="flat"
          onClick={() => copy(value)}
          icon={<CopyLineIcon />}
        />
      )}
    </div>
  );
};

const InviteUserModal = ({
  showDialog,
  setShowDialog,
}: {
  showDialog: boolean;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionData>();
  const { data } = fetcher;
  const [_role, _setRole] = useState('');

  return (
    <SlidingModal size="s" open={showDialog} onOpenChange={() => setShowDialog(false)}>
      <SlidingModalHeader>
        <SlidingModalHeaderWrapper>Invite user</SlidingModalHeaderWrapper>
      </SlidingModalHeader>
      <SlidingModalCloseButton />
      <SlidingModalContent>
        {data?.success && data?.successMessage ? (
          <SuccessModalContent text={data?.successMessage}>
            {data?.invite_url && (
              <p className={`my-4 text-p7 text-status-success`}>
                {data?.invite_url} , invite will expire after {data?.invite_expiry_hours}{' '}
                hours
              </p>
            )}
          </SuccessModalContent>
        ) : (
          <fetcher.Form method="post" className="flex flex-col gap-y-8 mt-4 mx-4">
            <TextInput
              label="Email"
              type={'email'}
              placeholder="Email"
              name="email"
              color={data?.fieldErrors?.email ? 'error' : 'default'}
              required
              helperText={data?.fieldErrors?.email}
            />
            <Listbox
              required
              variant="underline"
              value={_role}
              name="role"
              label={'Role'}
              placeholder="Role"
              color={data?.fieldErrors?.role ? 'error' : 'default'}
              helperText={data?.fieldErrors?.role}
              onChange={(item: string) => {
                _setRole(item);
              }}
              getDisplayValue={() => {
                return Object.keys(ModelUpdateUserIDRequestRoleEnum).filter((item) => {
                  return item === _role;
                })[0];
              }}
            >
              {Object.keys(ModelUpdateUserIDRequestRoleEnum).map((role) => {
                return (
                  <ListboxOption value={role} key={role}>
                    {role}
                  </ListboxOption>
                );
              })}
            </Listbox>

            {!data?.success && data?.message && (
              <div className={`text-status-error text-p7`}>
                <span>{data?.message}</span>
              </div>
            )}
            <div className="flex items-center gap-x-2 mt-6">
              <Button
                size="md"
                type="submit"
                name="intent"
                value={ModelInviteUserRequestActionEnum['SendInviteEmail']}
                loading={fetcher.state === 'submitting'}
                disabled={fetcher.state === 'submitting'}
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
                variant="outline"
                type="submit"
                size="md"
                name="intent"
                value={ModelInviteUserRequestActionEnum['GetInviteLink']}
                loading={fetcher.state === 'submitting'}
                disabled={fetcher.state === 'submitting'}
              >
                Copy invite link
              </Button>
            </div>
            {data?.invite_url && (
              <div className={`mt-1.5 font-normal text-p4 group relative`}>
                <DFLink
                  unstyled
                  href={data?.invite_url ?? ''}
                  target="_blank"
                  rel="noreferrer"
                  className="text-text-link underline block w-[94%]"
                  data-testid="inviteUrlId"
                >
                  {data?.invite_url}
                </DFLink>
                <CopyField value={data?.invite_url} />
                <span className="mt-4 block">
                  Use above invite link for registration, the link will expire after{' '}
                  {data?.invite_expiry_hours} hours.
                </span>
              </div>
            )}
          </fetcher.Form>
        )}
      </SlidingModalContent>
    </SlidingModal>
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
  const fetcher = useFetcher<ActionData>();
  const { data } = fetcher;

  const role = Object.entries(ModelUpdateUserIDRequestRoleEnum).find(
    ([, val]) => val === user.role,
  )?.[0];
  const [_role, _setRole] = useState(role);
  const [_status, _setStatus] = useState(() => (user.is_active ? 'Active' : 'Inactive'));

  return (
    <SlidingModal size="s" open={showDialog} onOpenChange={() => setShowDialog(false)}>
      <SlidingModalHeader>
        <SlidingModalHeaderWrapper>Update user</SlidingModalHeaderWrapper>
      </SlidingModalHeader>
      <SlidingModalCloseButton />
      <SlidingModalContent>
        {!data?.success ? (
          <fetcher.Form method="post" className="flex flex-col gap-y-8 mt-4 mx-4">
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
              defaultValue={user?.first_name}
              helperText={data?.fieldErrors?.firstName}
              required
            />
            <TextInput
              label="Last Name"
              type={'text'}
              placeholder="Last Name"
              name="lastName"
              color={data?.fieldErrors?.lastName ? 'error' : 'default'}
              defaultValue={user?.last_name}
              helperText={data?.fieldErrors?.lastName}
              required
            />
            <Listbox
              variant="underline"
              value={_role}
              defaultValue={_role}
              name="role"
              label={'Role'}
              placeholder="Role"
              helperText={data?.fieldErrors?.role}
              onChange={(item) => {
                _setRole(item);
              }}
              getDisplayValue={() => {
                return (
                  Object.keys(ModelUpdateUserIDRequestRoleEnum).find((item) => {
                    return item === _role;
                  }) ?? ''
                );
              }}
            >
              {Object.keys(ModelUpdateUserIDRequestRoleEnum).map((role) => {
                return (
                  <ListboxOption value={role} key={role}>
                    {role}
                  </ListboxOption>
                );
              })}
            </Listbox>
            <Listbox
              variant="underline"
              value={_status}
              name="status"
              label={'Status'}
              placeholder="Active"
              defaultValue={_status}
              helperText={data?.fieldErrors?.status}
              onChange={(item) => {
                _setStatus(item);
              }}
              getDisplayValue={() => {
                return ['Active', 'Inactive'].filter((item) => {
                  return item === _status;
                })[0];
              }}
            >
              <ListboxOption value="Active">Active</ListboxOption>
              <ListboxOption value="Inactive">Inactive</ListboxOption>
            </Listbox>
            {!data?.success && data?.message && (
              <p className="text-status-error text-p7">{data.message}</p>
            )}

            <div className="flex gap-x-2 mt-6">
              <Button
                size="md"
                type="submit"
                loading={fetcher.state !== 'idle'}
                disabled={fetcher.state !== 'idle'}
              >
                Update
              </Button>
              <Button
                size="md"
                variant="outline"
                type="button"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </fetcher.Form>
        ) : (
          <SuccessModalContent text="Updated successfully" />
        )}
      </SlidingModalContent>
    </SlidingModal>
  );
};

const APITokenSkeletonComponent = () => {
  return (
    <div className="flex flex-col gap-y-4 animate-pulse min-w-[400px]">
      <div className="h-10 w-72 bg-[#939A9F]/25 dark:bg-bg-grid-border py-4 rounded-md"></div>
      <div className="flex gap-x-[140px]">
        <div className="h-5 w-16 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded-md"></div>
        <div className="h-5 w-56 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded-md"></div>
      </div>
      <div className="flex gap-x-[140px]">
        <div className="h-5 w-16 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded-md"></div>
        <div className="h-5 w-56 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded-md"></div>
      </div>
      <div className="flex gap-x-[140px]">
        <div className="h-5 w-16 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded-md"></div>
        <div className="h-5 w-56 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded-md"></div>
      </div>
      <div className="flex gap-x-[140px]">
        <div className="h-5 w-16 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded-md"></div>
        <div className="h-5 w-56 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded-md"></div>
      </div>
    </div>
  );
};
const ApiToken = () => {
  const [showApikey, setShowApiKey] = useState(false);
  const [showResetAPIKeyModal, setShowResetAPIKeyModal] = useState(false);
  const { data } = useGetApiToken();
  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <>
      <span className="font-mono">
        {showApikey
          ? data?.apiToken?.api_token || '-'
          : '********************************************'}
      </span>
      <div className="flex ml-2 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          startIcon={showApikey ? <EyeHideSolid /> : <EyeSolidIcon />}
          onClick={() => setShowApiKey((prev) => !prev)}
        >
          {showApikey ? 'Hide' : 'Show'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          startIcon={<CopyLineIcon />}
          onClick={() => copy(data?.apiToken?.api_token ?? '')}
        >
          {isCopied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          color="error"
          startIcon={<RefreshIcon />}
          onClick={() => setShowResetAPIKeyModal(true)}
        >
          Reset Key
        </Button>
      </div>
      {showResetAPIKeyModal && (
        <ResetAPIKeyConfirmationModal
          showDialog={showResetAPIKeyModal}
          setShowDialog={setShowResetAPIKeyModal}
        />
      )}
    </>
  );
};

const CurrentUserInfo = ({
  setOpenChangePasswordForm,
}: {
  setOpenChangePasswordForm: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { data: user } = useGetCurrentUser();
  const currentUser = user.user;
  return (
    <div data-testid="currentUserWrapperId">
      <div className="flex items-center">
        <div className="flex items-end gap-x-4">
          <span className="text-2xl dark:text-text-input-value text-text-text-and-icon font-semibold min-w-[124px]">
            {`${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`}
          </span>
          <Button
            size="sm"
            className="ml-auto"
            variant="outline"
            onClick={() => setOpenChangePasswordForm(true)}
          >
            Change Password
          </Button>
        </div>
      </div>
      <div className="flex mt-4 mb-2 items-center" data-testid="loginUserStatusWrapperId">
        <span className="text-p4 min-w-[140px] text-text-text-and-icon">Status</span>
        <span
          className={cn('text-p4a text-text-input-value', {
            'text-status-success': currentUser?.is_active,
            'text-gray-700 dark:text-df-gray-400': !currentUser?.is_active,
          })}
        >
          {currentUser?.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="flex mt-4 mb-2" data-testid="loginUserEmailWrapperId">
        <span className="text-p4 min-w-[140px] text-text-text-and-icon">Email</span>
        <span className="text-p4a text-text-input-value" data-testid="currentUserEmailId">
          {currentUser?.email || '-'}
        </span>
      </div>
      <div className="flex my-3">
        <span className="text-p4 min-w-[140px] text-text-text-and-icon">Company</span>
        <span className="text-p4a text-text-input-value">
          {currentUser?.company || '-'}
        </span>
      </div>
      <div className="flex my-3">
        <span className="text-p4 min-w-[140px] text-text-text-and-icon">Role</span>
        <span className="text-p4a text-text-input-value">{currentUser?.role || '-'}</span>
      </div>
      <div className="flex my-3">
        <span className="text-p4 min-w-[140px] text-text-text-and-icon">API key</span>
        <div className="text-p4a items-center text-text-input-value flex gap-x-2">
          <Suspense fallback={<CircleSpinner size="sm" />}>
            <ApiToken />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

const APITokenComponent = () => {
  const [openChangePasswordForm, setOpenChangePasswordForm] = useState(false);

  return (
    <div className="text-gray-600 dark:text-white rounded-lg w-full">
      <ChangePasswordModal
        showDialog={openChangePasswordForm}
        setShowDialog={setOpenChangePasswordForm}
      />
      <Suspense fallback={<APITokenSkeletonComponent />}>
        <CurrentUserInfo setOpenChangePasswordForm={setOpenChangePasswordForm} />
      </Suspense>
    </div>
  );
};

const UsersTable = ({
  onTableAction,
}: {
  onTableAction: (row: ModelUser, action: ActionEnumType) => void;
}) => {
  const columnHelper = createColumnHelper<ModelUser>();
  const columns = useMemo(() => {
    const columns = [
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          if (!cell.row.original.id) {
            throw new Error('User id not found');
          }
          return (
            <ActionDropdown
              user={cell.row.original}
              onTableAction={onTableAction}
              trigger={
                <button className="p-1">
                  <div className="h-[16px] w-[16px] text-text-text-and-icon rotate-90">
                    <EllipsisIcon />
                  </div>
                </button>
              }
            />
          );
        },
        header: () => '',
        minSize: 25,
        size: 25,
        maxSize: 25,
        enableResizing: false,
      }),
      columnHelper.accessor('id', {
        cell: (cell) => cell.getValue(),
        header: () => 'ID',
        minSize: 30,
        size: 30,
        maxSize: 85,
      }),
      columnHelper.accessor('first_name', {
        cell: (cell) => cell.getValue(),
        header: () => 'First name',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('last_name', {
        cell: (cell) => cell.getValue(),
        header: () => 'Last name',
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
        cell: (cell) => capitalize(cell.getValue()),
        header: () => 'Role',
        minSize: 60,
        size: 60,
        maxSize: 70,
      }),
      columnHelper.accessor('is_active', {
        cell: (cell) => {
          const active = cell.getValue();
          if (active) {
            return <span className="text-status-success">Yes</span>;
          }
          return <span className="text-status-error">No</span>;
        },
        header: () => 'Active',
        minSize: 60,
        size: 60,
        maxSize: 70,
      }),
    ];
    return columns;
  }, []);
  const { data } = useListUsers();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  if (data?.error?.message) {
    return <p className="text-status-error text-p7">{data.error.message}</p>;
  }
  return (
    <div className="mt-2">
      <Table
        pageSize={pageSize}
        size="default"
        data={data.data ?? []}
        columns={columns}
        enableColumnResizing
        enableSorting
        enablePagination
        enablePageResize
        onPageResize={(newSize) => {
          setPageSize(newSize);
        }}
      />
    </div>
  );
};
const InviteButton = ({
  setOpenInviteUserForm,
}: {
  setOpenInviteUserForm: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { data } = useListUsers();
  if (data?.error?.message) {
    return null;
  }
  return (
    <Button
      variant="flat"
      size="sm"
      startIcon={<PlusIcon />}
      type="button"
      className="mt-2"
      onClick={() => setOpenInviteUserForm(true)}
    >
      Invite User
    </Button>
  );
};
const UserManagement = () => {
  const [openInviteUserForm, setOpenInviteUserForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditUserForm, setShowEditUserForm] = useState(false);

  const [user, setUser] = useState<ModelUser>();

  const onTableAction = (row: ModelUser, action: ActionEnumType) => {
    if (action === ActionEnumType.EDIT_USER) {
      setUser(row);
      setShowEditUserForm(true);
    } else if (action === ActionEnumType.DELETE_USER) {
      setUser(row);
      setShowDeleteDialog(true);
    }
  };

  return (
    <div className="h-full mt-2">
      {showDeleteDialog && user?.id && (
        <DeleteUserConfirmationModal
          showDialog={showDeleteDialog}
          userId={user.id}
          setShowDialog={setShowDeleteDialog}
        />
      )}
      {showEditUserForm && (
        <EditUserModal
          showDialog={showEditUserForm}
          user={user!}
          setShowDialog={setShowEditUserForm}
        />
      )}
      <APITokenComponent />
      {openInviteUserForm ? (
        <InviteUserModal
          showDialog={openInviteUserForm}
          setShowDialog={setOpenInviteUserForm}
        />
      ) : null}
      <div className="mt-6" data-testid="userAccountsWrapperId">
        <div className="mt-2">
          <h3 className="text-h6 text-text-input-value">User accounts</h3>
        </div>
        <Suspense
          fallback={
            <div className="animate-pulse h-6 w-32 bg-[#939A9F]/25 dark:bg-bg-grid-border rounded"></div>
          }
        >
          <InviteButton setOpenInviteUserForm={setOpenInviteUserForm} />
        </Suspense>

        <Suspense
          fallback={
            <TableSkeleton
              columns={6}
              rows={DEFAULT_PAGE_SIZE}
              size={'default'}
              className="mt-2"
            />
          }
        >
          <UsersTable onTableAction={onTableAction} />
        </Suspense>
      </div>
    </div>
  );
};

export const module = {
  element: <UserManagement />,
  action,
};

const DeleteUserConfirmationModal = ({
  showDialog,
  userId,
  setShowDialog,
}: {
  showDialog: boolean;
  userId: number;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionData>();

  const onDeleteAction = useCallback(() => {
    const formData = new FormData();
    formData.append('_actionType', ActionEnumType.DELETE);
    formData.append('userId', userId.toString());
    fetcher.submit(formData, {
      method: 'post',
    });
  }, [userId, fetcher]);
  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Delete user
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
          <div className={'flex gap-x-4 justify-end'}>
            <Button
              size="md"
              onClick={() => setShowDialog(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="md"
              color="error"
              type="submit"
              loading={fetcher.state !== 'idle'}
              disabled={fetcher.state !== 'idle'}
              onClick={(e) => {
                e.preventDefault();
                onDeleteAction();
              }}
            >
              Delete
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <div className="grid">
          <span>The selected user will be deleted. This action cannot be undone.</span>
          <br />
          <span>Are you sure you want to delete?</span>
          <br />
          {fetcher.data?.message && (
            <p className="mt-2 text-p7 text-status-error">{fetcher.data?.message}</p>
          )}
        </div>
      ) : (
        <SuccessModalContent text="Deleted successfully" />
      )}
    </Modal>
  );
};

const ResetAPIKeyConfirmationModal = ({
  showDialog,
  setShowDialog,
}: {
  showDialog: boolean;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher();

  const onResetAction = useCallback(() => {
    const formData = new FormData();
    formData.append('_actionType', ActionEnumType.RESET_API_KEY);
    fetcher.submit(formData, {
      method: 'post',
    });
  }, [fetcher]);

  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Reset API key
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
          <div className={'flex gap-x-4 justify-end'}>
            <Button
              size="md"
              onClick={() => setShowDialog(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              color="error"
              size="md"
              type="submit"
              loading={fetcher.state !== 'idle'}
              disabled={fetcher.state !== 'idle'}
              onClick={(e) => {
                e.preventDefault();
                onResetAction();
              }}
            >
              Reset
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <div className="grid">
          <span>The API key will be reset. This action cannot be undone.</span>
          <br />
          <span>Are you sure you want to reset?</span>
          <br />
          {fetcher.data?.message && (
            <p className="text-p7 text-status-error">{fetcher.data?.message}</p>
          )}
          <div className="flex items-center justify-right gap-4"></div>
        </div>
      ) : (
        <SuccessModalContent text="API key reset successfully" />
      )}
    </Modal>
  );
};
