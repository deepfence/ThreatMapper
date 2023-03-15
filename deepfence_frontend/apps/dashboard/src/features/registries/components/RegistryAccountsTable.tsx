import { capitalize } from 'lodash-es';
import { useEffect, useMemo, useState } from 'react';
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
  Form,
  generatePath,
  useActionData,
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
import { MalwareScanActionEnumType } from '@/components/scan-configure-forms/MalwareScanConfigureForm';
import { SecretScanActionEnumType } from '@/components/scan-configure-forms/SecretScanConfigureForm';
import { VulnerabilityScanActionEnumType } from '@/components/scan-configure-forms/VulnerabilityScanConfigureForm';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { ConfigureScanModal } from '@/features/registries/components/ConfigureScanModal';
import { ApiError, makeRequest } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';

export type ActionReturnType = {
  message?: string;
  success: boolean;
};

export const action = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const id = formData.get('_accountId')?.toString() ?? '';
  const r = await makeRequest({
    apiFunction: getRegistriesApiClient().deleteRegistry,
    apiArgs: [
      {
        registryId: id,
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

  toast('Registry account deleted sucessfully');
  return {
    success: true,
  };
};

const DeleteConfirmationModal = ({
  showDialog,
  id,
  setShowDialog,
}: {
  showDialog: boolean;
  id: string;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const actionData = useActionData() as ActionReturnType;

  useEffect(() => {
    if (actionData?.success) {
      setShowDialog(false);
    }
  }, [actionData]);

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
        {actionData?.message && (
          <p className="text-red-500 text-sm mb-4">{actionData.message}</p>
        )}
        <div className="flex items-center justify-right gap-4">
          <Button size="xs" onClick={() => setShowDialog(false)}>
            No, cancel
          </Button>
          <Form method="post">
            <input type="text" name="_accountId" hidden readOnly value={id} />
            <Button size="xs" color="danger" type="submit">
              Yes, I&apos;m sure
            </Button>
          </Form>
        </div>
      </div>
    </Modal>
  );
};

const ActionDropdown = ({ id }: { id: string }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [openScanConfigure, setOpenScanConfigure] = useState('');

  return (
    <>
      <DeleteConfirmationModal
        showDialog={showDeleteDialog}
        id={id}
        setShowDialog={setShowDeleteDialog}
      />
      <ConfigureScanModal
        open={openScanConfigure !== ''}
        setOpen={setOpenScanConfigure}
        scanType={openScanConfigure}
        wantAdvanceOptions={true}
        data={{
          nodeIds: [id],
          nodeType: 'registry',
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
                      setOpenScanConfigure(
                        VulnerabilityScanActionEnumType.SCAN_VULNERABILITY,
                      )
                    }
                  >
                    <div className="w-4 h-4">
                      <VulnerabilityIcon />
                    </div>
                    Scan for vulnerability
                  </DropdownItem>
                  <DropdownItem
                    onClick={() =>
                      setOpenScanConfigure(SecretScanActionEnumType.SCAN_SECRET)
                    }
                  >
                    <div className="w-4 h-4">
                      <SecretsIcon />
                    </div>
                    Scan for secret
                  </DropdownItem>
                  <DropdownItem
                    onClick={() =>
                      setOpenScanConfigure(MalwareScanActionEnumType.SCAN_MALWARE)
                    }
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
            <DropdownItem className="text-sm">
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
              to={generatePath('/registries/images/:account/:accountId/:nodeId', {
                account,
                nodeId: info.row.original.node_id ?? '',
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
          const date = info.getValue();
          if (date !== undefined) {
            return formatMilliseconds(date);
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
          if (!cell.row.original.node_id) {
            throw new Error('Registry Account node id not found');
          }
          return <ActionDropdown id={cell.row.original.node_id.toString()} />;
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
