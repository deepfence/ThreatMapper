import { Suspense, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaPencilAlt } from 'react-icons/fa';
import { HiDotsVertical, HiGlobeAlt } from 'react-icons/hi';
import { ActionFunctionArgs, useFetcher, useLoaderData } from 'react-router-dom';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  Modal,
  Table,
  TableSkeleton,
  TextInput,
} from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelSettingsResponse,
  ModelSettingUpdateRequestKeyEnum,
} from '@/api/generated';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

type LoaderDataType = {
  message?: string;
  data?: ModelSettingsResponse[];
};

type ActionReturnType = {
  message?: string;
  success: boolean;
  fieldErrors?: {
    value?: string;
  };
};

const action = async ({ request }: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);

  const r = await makeRequest({
    apiFunction: getSettingsApiClient().updateSettings,
    apiArgs: [
      {
        id: Number(body.id),
        modelSettingUpdateRequest: {
          key: body.key as ModelSettingUpdateRequestKeyEnum,
          value: body.value as string,
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
            value: modelResponse.error_fields?.value as string,
          },
          message: modelResponse.message ?? '',
          success: false,
        });
      } else if (r.status === 403) {
        return error.set({
          message: 'You do not have enough permissions to update settings',
          success: false,
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    let message = '';
    if (r.value()?.message === undefined) {
      message = 'Error in getting user audit logs';
    }
    message = r.value().message || '';
    return {
      message,
      success: false,
    };
  }
  return {
    success: true,
  };
};

const getData = async (): Promise<LoaderDataType> => {
  const response = await makeRequest({
    apiFunction: getSettingsApiClient().getSettings,
    apiArgs: [],
  });

  if (ApiError.isApiError(response)) {
    return {
      message: 'Error in getting settings list',
    };
  }

  return {
    data: response,
  };
};

const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getData(),
  });
};

const EditGlobalSettingModal = ({
  showDialog,
  setShowDialog,
  setting,
}: {
  showDialog: boolean;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setting: ModelSettingsResponse;
}) => {
  const fetcher = useFetcher<ActionReturnType>();
  const { data, state } = fetcher;

  return (
    <Modal
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title="Update Setting"
    >
      {!data?.success ? (
        <fetcher.Form
          method="post"
          className="flex flex-col gap-y-3 pt-2 pb-6 mx-8 w-[260px]"
        >
          <TextInput type="hidden" className="hidden" name="id" value={setting?.id} />
          <TextInput type="hidden" className="hidden" name="key" value={setting?.key} />
          <TextInput
            label={setting?.label}
            type={'text'}
            placeholder={setting?.key}
            name="value"
            color={data?.fieldErrors?.value ? 'error' : 'default'}
            sizing="sm"
            defaultValue={setting?.value}
            helperText={data?.fieldErrors?.value}
            required
          />
          <div className={`text-red-600 dark:text-red-500 text-sm`}>
            {!data?.success && data?.message && <span>{data.message}</span>}
          </div>
          <Button
            color="primary"
            className=" pl-3"
            type="submit"
            size="sm"
            disabled={state !== 'idle'}
            loading={state !== 'idle'}
          >
            Update
          </Button>
        </fetcher.Form>
      ) : (
        <SuccessModalContent text="Global Settings successfully updated!" />
      )}
    </Modal>
  );
};

const ActionDropdown = ({ setting }: { setting: ModelSettingsResponse }) => {
  const [openEditSetting, setOpenEditSetting] = useState(false);

  return (
    <>
      <EditGlobalSettingModal
        showDialog={openEditSetting}
        setShowDialog={setOpenEditSetting}
        setting={setting}
      />
      <Dropdown
        triggerAsChild={true}
        align="end"
        content={
          <>
            <DropdownItem className="text-sm" onClick={() => setOpenEditSetting(true)}>
              <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
                <IconContext.Provider
                  value={{ className: 'text-gray-700 dark:text-gray-400' }}
                >
                  <FaPencilAlt />
                </IconContext.Provider>
                Edit
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
const GlobalSettings = () => {
  const columnHelper = createColumnHelper<ModelSettingsResponse>();
  const loaderData = useLoaderData() as LoaderDataType;
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('label', {
        cell: (cell) => cell.getValue(),
        header: () => 'Setting',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('value', {
        cell: (cell) => cell.getValue(),
        header: () => 'Value',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),

      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          if (!cell.row.original.id) {
            throw new Error('Settings not found');
          }
          return <ActionDropdown setting={cell.row.original} />;
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
    <SettingsTab value="global-settings">
      <div className="h-full">
        <div className="mt-2 flex gap-x-2 items-center">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 bg-opacity-75 dark:bg-opacity-50 flex items-center justify-center rounded-sm">
            <IconContext.Provider
              value={{
                className: 'text-blue-600 dark:text-blue-400',
              }}
            >
              <HiGlobeAlt />
            </IconContext.Provider>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white text-base">
            Global Settings
          </h3>
        </div>
        <Suspense
          fallback={<TableSkeleton columns={3} rows={3} size={'sm'} className="mt-4" />}
        >
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType) => {
              const { data, message } = resolvedData;
              const settings = data ?? [];

              return (
                <div className="mt-4">
                  {message ? (
                    <p className="text-red-500 text-sm">{message}</p>
                  ) : (
                    <Table
                      size="sm"
                      data={settings}
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
  element: <GlobalSettings />,
  loader,
  action,
};
