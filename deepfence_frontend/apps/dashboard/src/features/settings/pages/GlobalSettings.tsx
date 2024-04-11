import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo, useState } from 'react';
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
  TableNoDataElement,
  TableSkeleton,
  TextInput,
} from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import { ModelSettingsResponse, ModelSettingUpdateRequestKeyEnum } from '@/api/generated';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { SlidingModalHeaderWrapper } from '@/features/common/SlidingModalHeaderWrapper';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';

const DEFAULT_PAGE_SIZE = 10;
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
      const { message } = await getResponseErrors(updateResponse.error);
      return {
        success: false,
        message,
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
        <SlidingModalHeaderWrapper>Update setting</SlidingModalHeaderWrapper>
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
            <div className={`text-status-error text-p7`}>
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
          <SuccessModalContent text="Updated successfully" />
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
      {openEditSetting && (
        <EditGlobalSettingModal
          showDialog={openEditSetting}
          setShowDialog={setOpenEditSetting}
          setting={setting}
        />
      )}

      <Dropdown
        triggerAsChild={true}
        align="start"
        content={
          <>
            <DropdownItem className="text-sm" onClick={() => setOpenEditSetting(true)}>
              <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
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
                  <div className="h-[16px] w-[16px] text-text-text-and-icon rotate-90">
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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  return (
    <div className="mt-2">
      {data.message ? (
        <p className="text-status-error text-p7">{data.message}</p>
      ) : (
        <Table
          size="default"
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
          noDataElement={<TableNoDataElement text="No settings found" />}
        />
      )}
    </div>
  );
};
const GlobalSettings = () => {
  return (
    <div className="h-full">
      <div className="mt-2">
        <h3 className="text-h6 text-text-input-value">Global settings</h3>
      </div>
      <Suspense
        fallback={
          <TableSkeleton
            columns={3}
            rows={DEFAULT_PAGE_SIZE}
            size={'default'}
            className="mt-4"
          />
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
