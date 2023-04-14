import { Suspense, useMemo } from 'react';
import { IconContext } from 'react-icons';
import { FaPencilAlt } from 'react-icons/fa';
import { HiDotsVertical } from 'react-icons/hi';
import { generatePath, useLoaderData } from 'react-router-dom';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import { ModelSettingsResponse } from '@/api/generated';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { usePageNavigation } from '@/utils/usePageNavigation';

type LoaderDataType = {
  message?: string;
  data?: ModelSettingsResponse[];
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

const ActionDropdown = ({ id }: { id: string }) => {
  const { navigate } = usePageNavigation();

  return (
    <>
      <Dropdown
        triggerAsChild={true}
        align="end"
        content={
          <>
            <DropdownItem
              className="text-sm"
              onClick={() => {
                navigate(
                  generatePath('/settings/global-settings/edit/:id', {
                    id: id,
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
    <SettingsTab value="global-settings">
      <div className="h-full px-2">
        <Suspense fallback={<TableSkeleton columns={3} rows={3} size={'sm'} />}>
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType) => {
              const { data, message } = resolvedData;
              const settings = data ?? [];

              return (
                <div>
                  <div className="flex justify-between">
                    <h3 className="py-2 font-medium text-gray-900 dark:text-white uppercase text-sm tracking-wider">
                      Global Settings
                    </h3>
                  </div>

                  {message ? (
                    <p className="text-red-500 text-sm">{message}</p>
                  ) : (
                    <Table
                      size="sm"
                      data={settings}
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
  element: <GlobalSettings />,
  loader,
};
