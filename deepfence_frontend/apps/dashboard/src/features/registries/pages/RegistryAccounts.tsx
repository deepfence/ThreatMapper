import { useSuspenseQuery } from '@suspensive/react-query';
import { useIsFetching } from '@tanstack/react-query';
import { isEmpty } from 'lodash-es';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { ActionFunctionArgs, useFetcher, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbLink,
  Button,
  Card,
  CircleSpinner,
  Dropdown,
  DropdownItem,
  Modal,
  RowSelectionState,
  TableSkeleton,
} from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelSummary } from '@/api/generated';
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { PlusIcon } from '@/components/icons/common/Plus';
import { ImageIcon } from '@/components/icons/image';
import { InProgressIcon } from '@/components/icons/registries/InProgress';
import { StartScanIcon } from '@/components/icons/registries/StartScan';
import { TagsIcon } from '@/components/icons/registries/Tags';
import { RegistryIcon } from '@/components/sideNavigation/icons/Registry';
import { AddRegistryModal } from '@/features/registries/components/AddRegistryModal';
import { RegistryAccountsTable } from '@/features/registries/components/RegistryAccountsTable';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import {
  MalwareScanNodeTypeEnum,
  registryTypeToNameMapping,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { abbreviateNumber } from '@/utils/number';

export enum ActionEnumType {
  DELETE = 'delete',
  START_SCAN = 'start_scan',
  SYNC_IMAGES = 'sync_images',
}
type ActionData = {
  action: ActionEnumType;
  success: boolean;
  message?: string;
} | null;

export type RegistryScanType =
  | typeof ScanTypeEnum.VulnerabilityScan
  | typeof ScanTypeEnum.SecretScan
  | typeof ScanTypeEnum.MalwareScan;

function getScanOptions(
  scanType: ScanTypeEnum,
  ids: string[],
): ConfigureScanModalProps['scanOptions'] {
  if (scanType === ScanTypeEnum.VulnerabilityScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodes: ids.map((id) => ({
          nodeId: id,
          nodeType: VulnerabilityScanNodeTypeEnum.registry,
        })),
      },
    };
  }

  if (scanType === ScanTypeEnum.SecretScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodes: ids.map((id) => ({
          nodeId: id,
          nodeType: SecretScanNodeTypeEnum.registry,
        })),
      },
    };
  }

  if (scanType === ScanTypeEnum.MalwareScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodes: ids.map((id) => ({
          nodeId: id,
          nodeType: MalwareScanNodeTypeEnum.registry,
        })),
      },
    };
  }

  throw new Error('invalid scan type');
}

const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  const actionType = formData.get('actionType');

  if (actionType === ActionEnumType.DELETE) {
    const id = formData.get('nodeIds')?.toString() ?? '';
    const deleteRegistry = apiWrapper({ fn: getRegistriesApiClient().deleteRegistry });
    const r = await deleteRegistry({
      registryId: id,
    });

    if (!r.ok) {
      if (r.error.response.status === 400 || r.error.response.status === 404) {
        const modelResponse: ApiDocsBadRequestResponse = await r.error.response.json();
        return {
          message: modelResponse.message ?? '',
          success: false,
          action: actionType,
        };
      } else if (r.error.response.status === 403) {
        const message = await get403Message(r.error);
        return {
          message,
          success: false,
          action: actionType,
        };
      }
      throw r.error;
    }
    invalidateAllQueries();
    return {
      success: true,
      action: ActionEnumType.DELETE,
    };
  } else if (actionType === ActionEnumType.SYNC_IMAGES) {
    const registryId = formData.get('nodeIds')?.toString() ?? '';
    if (!registryId) {
      throw new Error('Registry id is required to sync images');
    }
    const syncRegistryImagesApi = apiWrapper({
      fn: getRegistriesApiClient().syncRegistryImages,
    });

    const result = await syncRegistryImagesApi({
      registryId,
    });
    if (!result.ok) {
      if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        toast.error(message);
        return {
          success: false,
          message,
          action: actionType,
        };
      }
      throw result.error;
    }
    invalidateAllQueries();
    toast.success('Sync registry images started successfully, please wait for sometime');
  }
  return null;
};

const DEFAULT_PAGE_SIZE = 10;

const useCounts = () => {
  const params = useParams() as {
    account: string;
  };
  return useSuspenseQuery({
    ...queries.registry.registrySummaryByType({
      registryType: params.account,
    }),
  });
};
const DeleteConfirmationModal = ({
  id,
  showDialog,
  setShowDialog,
  onDeleteSuccess,
}: {
  showDialog: boolean;
  id: string;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onDeleteSuccess: () => void;
}) => {
  const fetcher = useFetcher<ActionData>();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      formData.append('nodeIds', id);

      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [fetcher, id],
  );

  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data?.success &&
      fetcher.data.action === ActionEnumType.DELETE
    ) {
      onDeleteSuccess();
    }
  }, [fetcher]);

  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center dark:text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Delete registry
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
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
              onClick={(e) => {
                e.preventDefault();
                onDeleteAction(ActionEnumType.DELETE);
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
          <span>The selected registry will be deleted.</span>
          <br />
          <span>Are you sure you want to delete?</span>
          {fetcher.data?.message && (
            <p className="mt-2 text-p7 dark:text-status-error">{fetcher.data?.message}</p>
          )}
        </div>
      ) : (
        <SuccessModalContent text="Deleted successfully!" />
      )}
    </Modal>
  );
};

const Header = () => {
  const params = useParams() as {
    account: string;
  };
  const isFetching = useIsFetching({
    queryKey: queries.registry.listRegistryAccounts._def,
  });
  return (
    <div className="flex pl-4 pr-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
      <Breadcrumb>
        <BreadcrumbLink asChild icon={<RegistryIcon />} isLink>
          <DFLink to={'/registries'} unstyled>
            Registries
          </DFLink>
        </BreadcrumbLink>
        <BreadcrumbLink>
          <span className="inherit cursor-auto">
            {registryTypeToNameMapping[params.account]}
          </span>
        </BreadcrumbLink>
      </Breadcrumb>
      <div className="ml-2 flex items-center">
        {isFetching ? <CircleSpinner size="sm" /> : null}
      </div>
    </div>
  );
};

const CountWidget = () => {
  const { data } = useCounts();

  if (isEmpty(data.summary)) {
    return (
      <div className="w-full text-md text-gray-900 dark:text-text-white">No data</div>
    );
  }

  const {
    images = 0,
    tags = 0,
    scans_in_progress = 0,
    registries = 0,
  } = data.summary as ModelSummary;

  return (
    <div className="grid grid-cols-12 px-6 items-center w-full">
      <div className="col-span-3 flex items-center dark:text-text-text-and-icon gap-x-3 justify-center">
        <div className="w-8 h-8">
          <RegistryIcon />
        </div>

        <div className="flex flex-col items-start">
          <span className="text-h1 dark:text-text-input-value">
            {abbreviateNumber(registries)}
          </span>
          <span className="text-p1">Total registries</span>
        </div>
      </div>
      <div className="col-span-3 flex items-center dark:text-text-text-and-icon gap-x-3 justify-center">
        <div className="w-8 h-8">
          <ImageIcon />
        </div>

        <div className="flex flex-col items-start">
          <span className="text-h1 dark:text-text-input-value">
            {abbreviateNumber(images)}
          </span>
          <span className="text-p1">Total images</span>
        </div>
      </div>
      <div className="col-span-3 flex items-center dark:text-text-text-and-icon gap-x-3 justify-center">
        <div className="w-8 h-8">
          <TagsIcon />
        </div>

        <div className="flex flex-col items-start">
          <span className="text-h1 dark:text-text-input-value">
            {abbreviateNumber(tags)}
          </span>
          <span className="text-p1">Total tags</span>
        </div>
      </div>
      <div className="col-span-3 flex items-center dark:text-text-text-and-icon gap-x-3 justify-center">
        <div className="w-8 h-8">
          <InProgressIcon />
        </div>

        <div className="flex flex-col items-start">
          <span className="text-h1 dark:text-text-input-value">
            {abbreviateNumber(scans_in_progress)}
          </span>
          <span className="text-p1">In Progress</span>
        </div>
      </div>
    </div>
  );
};
const Widgets = () => {
  return (
    <Card className="min-h-[130px] px-4 flex">
      <Suspense
        fallback={
          <div className="flex m-auto items-center min-h-[100px]">
            <CircleSpinner size="md" />
          </div>
        }
      >
        <CountWidget />
      </Suspense>
    </Card>
  );
};
const BulkActions = ({
  ids,
  onTableAction,
  setAddRegistryModal,
}: {
  ids: string[];
  onTableAction: (ids: string[], scanType: RegistryScanType, actionType: string) => void;
  setAddRegistryModal: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <>
      <Button
        color="default"
        variant="flat"
        size="sm"
        startIcon={<PlusIcon />}
        onClick={() => {
          setAddRegistryModal(true);
        }}
      >
        ADD NEW REGISTRY
      </Button>
      <Dropdown
        triggerAsChild
        align={'start'}
        disabled={!ids.length}
        content={
          <>
            <DropdownItem
              onClick={() =>
                onTableAction(
                  ids,
                  ScanTypeEnum.VulnerabilityScan,
                  ActionEnumType.START_SCAN,
                )
              }
            >
              Start Vulnerability Scan
            </DropdownItem>
            <DropdownItem
              onClick={() =>
                onTableAction(ids, ScanTypeEnum.SecretScan, ActionEnumType.START_SCAN)
              }
            >
              Start Secret Scan
            </DropdownItem>
            <DropdownItem
              onClick={() =>
                onTableAction(ids, ScanTypeEnum.MalwareScan, ActionEnumType.START_SCAN)
              }
            >
              Start Malware Scan
            </DropdownItem>
          </>
        }
      >
        <Button
          color="default"
          variant="flat"
          size="sm"
          startIcon={<StartScanIcon />}
          endIcon={<CaretDown />}
          disabled={!ids.length}
        >
          Start scan
        </Button>
      </Dropdown>
    </>
  );
};
const RegistryAccountsResults = () => {
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [selectedScanType, setSelectedScanType] = useState<
    | typeof ScanTypeEnum.VulnerabilityScan
    | typeof ScanTypeEnum.SecretScan
    | typeof ScanTypeEnum.MalwareScan
  >();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string>('');
  const [nodeIdsToScan, setNodeIdsToScan] = useState<string[]>([]);
  const fetcher = useFetcher<ActionData>();

  const [addRegistryModal, setAddRegistryModal] = useState<boolean>(false);

  const onTableAction = useCallback(
    (id: string[], scanType: RegistryScanType, actionType: string) => {
      if (actionType === ActionEnumType.START_SCAN) {
        setNodeIdsToScan(id);
        setSelectedScanType(scanType);
        return;
      } else if (actionType === ActionEnumType.SYNC_IMAGES) {
        const formData = new FormData();
        formData.append('actionType', actionType);
        formData.append('nodeIds', id[0]);
        fetcher.submit(formData, {
          method: 'post',
        });
      }
    },
    [fetcher],
  );

  return (
    <div className="self-start">
      <div className="h-12 flex items-center">
        <BulkActions
          ids={Object.keys(rowSelectionState)}
          onTableAction={onTableAction}
          setAddRegistryModal={setAddRegistryModal}
        />
        <ConfigureScanModal
          open={!!selectedScanType}
          onOpenChange={() => setSelectedScanType(undefined)}
          scanOptions={
            selectedScanType ? getScanOptions(selectedScanType, nodeIdsToScan) : undefined
          }
        />
      </div>
      <Suspense fallback={<TableSkeleton columns={7} rows={DEFAULT_PAGE_SIZE} />}>
        <RegistryAccountsTable
          onTableAction={onTableAction}
          setShowDeleteDialog={setShowDeleteDialog}
          setIdsToDelete={setIdsToDelete}
          rowSelectionState={rowSelectionState}
          setRowSelectionState={setRowSelectionState}
        />
      </Suspense>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          id={idsToDelete}
          setShowDialog={setShowDeleteDialog}
          onDeleteSuccess={() => {
            setRowSelectionState({});
          }}
        />
      )}
      {
        <AddRegistryModal
          setAddRegistryModal={setAddRegistryModal}
          open={addRegistryModal}
        />
      }
    </div>
  );
};

const RegistryAccounts = () => {
  return (
    <>
      <Header />
      <div className="m-4">
        <Widgets />
        <div className="py-4">
          <RegistryAccountsResults />
        </div>
      </div>
    </>
  );
};

export const module = {
  action,
  element: <RegistryAccounts />,
};
