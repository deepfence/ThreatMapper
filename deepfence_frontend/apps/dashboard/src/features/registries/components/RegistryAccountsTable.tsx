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
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import {
  MalwareScanNodeTypeEnum,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';
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
  const id = formData.get('_nodeId')?.toString() ?? '';
  const r = await makeRequest({
    apiFunction: getRegistriesApiClient().deleteRegistry,
    apiArgs: [
      {
        registryId: id,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ActionReturnType>({ success: false });
      if (r.status === 400 || r.status === 404) {
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
  const fetcher = useFetcher<ActionReturnType>();
  const { state, data } = fetcher;

  return (
    <Modal open={showDialog} onOpenChange={() => setShowDialog(false)}>
      {!fetcher.data?.success ? (
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
          {data?.message && <p className="text-red-500 text-sm mb-4">{data.message}</p>}
          <div className="flex items-center justify-right gap-4">
            <Button size="xs" onClick={() => setShowDialog(false)} type="button" outline>
              No, cancel
            </Button>
            <fetcher.Form method="post">
              <input type="text" name="_nodeId" hidden readOnly value={id} />
              <Button
                size="xs"
                color="danger"
                type="submit"
                disabled={state !== 'idle'}
                loading={state !== 'idle'}
              >
                Yes, I&apos;m sure
              </Button>
            </fetcher.Form>
          </div>
        </div>
      ) : (
        <SuccessModalContent text="Registry account deleted sucessfully!" />
      )}
    </Modal>
  );
};

const ActionDropdown = ({
  id,
  setIdsToDelete,
  setShowDeleteDialog,
}: {
  id: string;
  setIdsToDelete: React.Dispatch<React.SetStateAction<string>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [selectedScanType, setSelectedScanType] = useState<
    | typeof ScanTypeEnum.VulnerabilityScan
    | typeof ScanTypeEnum.SecretScan
    | typeof ScanTypeEnum.MalwareScan
  >();

  return (
    <>
      <ConfigureScanModal
        open={!!selectedScanType}
        onOpenChange={() => setSelectedScanType(undefined)}
        scanOptions={selectedScanType ? getScanOptions(selectedScanType, id) : undefined}
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
                    onClick={() => setSelectedScanType(ScanTypeEnum.VulnerabilityScan)}
                  >
                    <div className="w-4 h-4">
                      <VulnerabilityIcon />
                    </div>
                    Start Vulnerability Scan
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => setSelectedScanType(ScanTypeEnum.SecretScan)}
                  >
                    <div className="w-4 h-4">
                      <SecretsIcon />
                    </div>
                    Start Secret Scan
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => setSelectedScanType(ScanTypeEnum.MalwareScan)}
                  >
                    <div className="w-4 h-4">
                      <MalwareIcon />
                    </div>
                    Start Malware Scan
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
                setIdsToDelete(id);
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string>('');

  const columnHelper = createColumnHelper<ModelRegistryListResp>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: () => 'Name',
        cell: (info) => (
          <div>
            <DFLink
              to={generatePath('/registries/images/:account/:nodeId', {
                account,
                nodeId: info.row.original.node_id ?? '',
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
          return (
            <ActionDropdown
              id={cell.row.original.node_id.toString()}
              setIdsToDelete={setIdsToDelete}
              setShowDeleteDialog={setShowDeleteDialog}
            />
          );
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
  return (
    <div className="self-start">
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          id={idsToDelete}
          setShowDialog={setShowDeleteDialog}
        />
      )}
      <Table columns={columns} data={data} enableSorting size="sm" />
    </div>
  );
};

function getScanOptions(
  scanType: ScanTypeEnum,
  id: string,
): ConfigureScanModalProps['scanOptions'] {
  if (scanType === ScanTypeEnum.VulnerabilityScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodeIds: [id],
        nodeType: VulnerabilityScanNodeTypeEnum.registry,
      },
    };
  }

  if (scanType === ScanTypeEnum.SecretScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodeIds: [id],
        nodeType: SecretScanNodeTypeEnum.registry,
      },
    };
  }

  if (scanType === ScanTypeEnum.MalwareScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodeIds: [id],
        nodeType: MalwareScanNodeTypeEnum.registry,
      },
    };
  }

  throw new Error('invalid scan type');
}
