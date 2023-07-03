import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaPencilAlt } from 'react-icons/fa';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
  Table,
  TableSkeleton,
  TextInput,
} from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import { ModelSettingsResponse, ModelSettingUpdateRequestKeyEnum } from '@/api/generated';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateQueries, queries } from '@/queries';
import { apiWrapper } from '@/utils/api';

type ActionReturnType = {
  message?: string;
  success: boolean;
  fieldErrors?: {
    value?: string;
  };
};
const useGlobalSettings = () => {
  return useSuspenseQuery({
    ...queries.setting.listGlobalSettings(),
    keepPreviousData: true,
  });
};
const action = async ({ request }: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);

  const updateApi = apiWrapper({
    fn: getSettingsApiClient().updateSettings,
  });
  const updateResponse = await updateApi({
    id: Number(body.id),
    modelSettingUpdateRequest: {
      key: body.key as ModelSettingUpdateRequestKeyEnum,
      value: body.value as string,
    },
  });
  if (!updateResponse.ok) {
    if (updateResponse.error.response.status === 400) {
      return {
        success: false,
        message: updateResponse.error.message,
      };
    } else if (updateResponse.error.response.status === 403) {
      return {
        success: false,
        message: 'You do not have enough permissions to update settings',
      };
    }
    throw updateResponse.error;
  }

  invalidateQueries(queries.setting.listGlobalSettings._def);
  return {
    success: true,
  };
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
    <SlidingModal size="s" open={showDialog} onOpenChange={() => setShowDialog(false)}>
      <SlidingModalHeader>
        <div className="text-h3 dark:text-text-text-and-icon py-4 px-4 dark:bg-bg-breadcrumb-bar">
          Update setting
        </div>
      </SlidingModalHeader>
      <SlidingModalCloseButton />
      <SlidingModalContent>
        {!data?.success ? (
          <fetcher.Form method="post" className="flex flex-col gap-y-8 mt-2 mx-4">
            <TextInput type="hidden" className="hidden" name="id" value={setting?.id} />
            <TextInput type="hidden" className="hidden" name="key" value={setting?.key} />
            <TextInput
              label={setting?.label}
              type={'text'}
              placeholder={setting?.key}
              name="value"
              color={data?.fieldErrors?.value ? 'error' : 'default'}
              defaultValue={setting?.value}
              helperText={data?.fieldErrors?.value}
              required
            />
            <div className={`text-red-600 dark:text-status-error text-p7`}>
              {!data?.success && data?.message && <span>{data.message}</span>}
            </div>
            <div className="flex gap-x-2">
              <Button
                type="submit"
                size="sm"
                disabled={state !== 'idle'}
                loading={state !== 'idle'}
              >
                Update
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                type="button"
              >
                Cancel
              </Button>
            </div>
          </fetcher.Form>
        ) : (
          <SuccessModalContent text="Global Settings successfully updated!" />
        )}
      </SlidingModalContent>
    </SlidingModal>
  );
};

const ActionDropdown = ({
  setting,
  trigger,
}: {
  setting: ModelSettingsResponse;
  trigger: React.ReactNode;
}) => {
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
        align="start"
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
        {trigger}
      </Dropdown>
    </>
  );
};
const SettingTable = () => {
  const columnHelper = createColumnHelper<ModelSettingsResponse>();

  const columns = useMemo(() => {
    const columns = [
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          if (!cell.row.original.id) {
            throw new Error('Settings not found');
          }
          return (
            <ActionDropdown
              setting={cell.row.original}
              trigger={
                <button className="p-1">
                  <div className="h-[16px] w-[16px] dark:text-text-text-and-icon rotate-90">
                    <EllipsisIcon />
                  </div>
                </button>
              }
            />
          );
        },
        header: () => '',
        minSize: 15,
        size: 15,
        maxSize: 15,
        enableResizing: false,
      }),
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
    ];
    return columns;
  }, []);
  const { data } = useGlobalSettings();
  const [pageSize, setPageSize] = useState(10);
  return (
    <div className="mt-2">
      {data.message ? (
        <p className="dark:text-status-error text-sm">{data.message}</p>
      ) : (
        <Table
          size="compact"
          pageSize={pageSize}
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
      )}
    </div>
  );
};
const GlobalSettings = () => {
  return (
    <div className="h-full">
      <div className="mt-2">
        <h3 className="text-h6 dark:text-text-text-and-icon">Global Settings</h3>
      </div>
      <Suspense
        fallback={
          <TableSkeleton columns={3} rows={3} size={'compact'} className="mt-4" />
        }
      >
        <SettingTable />
      </Suspense>
    </div>
  );
};

export const module = {
  element: <GlobalSettings />,
  action,
};
