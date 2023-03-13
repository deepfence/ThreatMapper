import { capitalize } from 'lodash-es';
import { useCallback, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  HiArchive,
  HiChevronLeft,
  HiDotsVertical,
  HiOutlineExclamationCircle,
  HiPencil,
} from 'react-icons/hi';
import {
  ActionFunctionArgs,
  generatePath,
  useFetcher,
  useParams,
} from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  DropdownSubMenu,
  Modal,
  Table,
} from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelRegistryListResp } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import {
  ActionEnumType,
  ScanConfigureModal,
} from '@/components/scan-configure-forms/ScanConfigureModal';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { ApiError, makeRequest } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';

enum TableActionEnumType {
  DELETE = 'delete',
  EDIT = 'edit',
}

export type ActionReturnType = {
  message?: string;
};

export const action = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType | null> => {
  const formData = await request.formData();
  const actionType = formData.get('actionType');
  const ids = (formData.getAll('ids[]') ?? []) as string[];

  const r = await makeRequest({
    apiFunction: getRegistriesApiClient().deleteRegistry,
    apiArgs: [
      {
        registryId: +ids[0],
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ActionReturnType>({ message: '' });
      if (r.status === 400 || r.status === 409) {
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

  toast('Registry account deleted sucessfully');
  return null;
};

const DeleteConfirmationModal = ({
  showDialog,
  ids,
  setShowDialog,
}: {
  showDialog: boolean;
  ids: string[];
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      ids.forEach((item) => formData.append('ids[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [ids, fetcher],
  );

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
          The selected accounts will be deleted.
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
              onDeleteAction(TableActionEnumType.DELETE);
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

const ActionDropdown = ({ ids, label }: { ids: string[]; label?: string }) => {
  const fetcher = useFetcher();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [openScanConfigure, setOpenScanConfigure] = useState('');

  const onTableAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      formData.append('_nodeType', 'registry');

      ids.forEach((item) => formData.append('_nodeIds[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [ids],
  );

  return (
    <>
      <DeleteConfirmationModal
        showDialog={showDeleteDialog}
        ids={ids}
        setShowDialog={setShowDeleteDialog}
      />
      <ScanConfigureModal
        open={openScanConfigure !== ''}
        setOpen={setOpenScanConfigure}
        scanType={openScanConfigure}
        wantAdvanceOptions={true}
        data={{
          urlIds: ids,
          urlType: 'registry',
        }}
      />
      <Dropdown
        triggerAsChild={true}
        align="end"
        content={
          <>
            <DropdownSubMenu
              triggerAsChild
              content={
                <>
                  <DropdownItem
                    onClick={() =>
                      setOpenScanConfigure(ActionEnumType.SCAN_VULNERABILITY)
                    }
                  >
                    <div className="w-4 h-4">
                      <VulnerabilityIcon />
                    </div>
                    Scan for vulnerability
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => setOpenScanConfigure(ActionEnumType.SCAN_SECRET)}
                  >
                    <div className="w-4 h-4">
                      <SecretsIcon />
                    </div>
                    Scan for secret
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => setOpenScanConfigure(ActionEnumType.SCAN_MALWARE)}
                  >
                    <div className="w-4 h-4">
                      <MalwareIcon />
                    </div>
                    Scan for malware
                  </DropdownItem>
                </>
              }
            >
              <DropdownItem>
                <IconContext.Provider
                  value={{
                    className: 'w-4 h-4',
                  }}
                >
                  <HiChevronLeft />
                </IconContext.Provider>
                <span className="text-gray-700 dark:text-gray-400">Scan</span>
              </DropdownItem>
            </DropdownSubMenu>
            <DropdownItem
              className="text-sm"
              onClick={() => onTableAction(TableActionEnumType.EDIT)}
            >
              <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
                <IconContext.Provider
                  value={{ className: 'text-gray-700 dark:text-gray-400' }}
                >
                  <HiPencil />
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
                  <HiArchive />
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
          {label ? <span className="ml-2">{label}</span> : null}
        </Button>
      </Dropdown>
    </>
  );
};

export const RegistryAccountsTable = ({ data }: { data: ModelRegistryListResp[] }) => {
  const { account } = useParams() as {
    account: string;
  };

  const columnHelper = createColumnHelper<ModelRegistryListResp>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: () => 'Name',
        cell: (info) => (
          <div>
            <DFLink
              to={generatePath('/registries/images/:account/:accountId', {
                account,
                accountId: info.row.original.id?.toString() ?? '',
              })}
            >
              {capitalize(info.getValue())}
            </DFLink>
          </div>
        ),
        minSize: 100,
        size: 110,
        maxSize: 120,
      }),
      columnHelper.accessor('created_at', {
        enableSorting: true,
        header: () => 'Created',
        minSize: 100,
        size: 110,
        maxSize: 120,
        cell: (info) => {
          if (info.getValue()) {
            // return formatMilliseconds(info.getValue()); // TODO: format this string
            return info.getValue()?.toString();
          }
          return '';
        },
      }),
      columnHelper.accessor('non_secret', {
        enableSorting: false,
        header: () => 'Credentials',
        cell: (info) => <div className="truncate">{JSON.stringify(info.getValue())}</div>,
        minSize: 120,
        size: 130,
        maxSize: 140,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          if (!cell.row.original.id) {
            throw new Error('Registry Account id not found');
          }
          return <ActionDropdown ids={[cell.row.original.id.toString()]} />;
        },
        header: () => '',
        minSize: 20,
        size: 20,
        maxSize: 20,
        enableResizing: false,
      }),
    ],
    [],
  );
  return <Table columns={columns} data={data} enableSorting size="sm" />;
};
