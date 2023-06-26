import { useSuspenseQuery } from '@suspensive/react-query';
import { useIsFetching } from '@tanstack/react-query';
import { isEmpty } from 'lodash-es';
import { Suspense, useCallback, useState } from 'react';
import {
  ActionFunctionArgs,
  FetcherWithComponents,
  useFetcher,
  useParams,
} from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbLink,
  Button,
  Card,
  CircleSpinner,
  Modal,
  TableSkeleton,
} from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelSummary } from '@/api/generated';
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { SuccessIcon } from '@/components/icons/common/ScanStatuses';
import { ImageIcon } from '@/components/icons/image';
import { InProgressIcon } from '@/components/icons/registries/InProgress';
import { TagsIcon } from '@/components/icons/registries/Tags';
import { RegistryIcon } from '@/components/sideNavigation/icons/Registry';
import { RegistryAccountsTable } from '@/features/registries/components/RegistryAccountsTable';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { queries } from '@/queries';
import {
  MalwareScanNodeTypeEnum,
  registryTypeToNameMapping,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';
import { apiWrapper } from '@/utils/api';
import { abbreviateNumber } from '@/utils/number';

export enum ActionEnumType {
  DELETE = 'delete',
  START_SCAN = 'start_scan',
}
type ActionData = {
  action: ActionEnumType;
  success: boolean;
  message?: string;
} | null;

type ActionReturnType = {
  message?: string;
  success: boolean;
};

export type RegistryScanType =
  | typeof ScanTypeEnum.VulnerabilityScan
  | typeof ScanTypeEnum.SecretScan
  | typeof ScanTypeEnum.MalwareScan;

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

const action = async ({ request }: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
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
      };
    } else if (r.error.response.status === 403) {
      return {
        message: 'You do not have enough permissions to delete registry',
        success: false,
      };
    }
    throw r.error;
  }

  return {
    success: true,
  };
};
const useCounts = () => {
  const params = useParams() as {
    account: string;
  };
  return useSuspenseQuery({
    ...queries.registry.registrySummaryByType({
      registryType: params.account,
    }),
    keepPreviousData: true,
  });
};
const DeleteConfirmationModal = ({
  id,
  showDialog,
  setShowDialog,
  fetcher,
  onTableAction,
}: {
  showDialog: boolean;
  id: string;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onTableAction: (id: string, scanType: RegistryScanType, actionType: string) => void;
  fetcher: FetcherWithComponents<ActionData>;
}) => {
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
              size="sm"
              onClick={() => setShowDialog(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              color="error"
              onClick={(e) => {
                e.preventDefault();
                onTableAction(id, '' as RegistryScanType, ActionEnumType.DELETE);
              }}
            >
              Yes, I&apos;m sure
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
          {fetcher.data?.message && <p className="">{fetcher.data?.message}</p>}
          <div className="flex items-center justify-right gap-4"></div>
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
    <div className="flex pl-6 pr-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
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
    scans_complete = 0,
  } = data.summary as ModelSummary;

  return (
    <div className="grid grid-cols-12 px-6 items-center">
      <div className="col-span-3 flex items-center dark:text-text-text-and-icon gap-x-3 justify-center">
        <div className="w-8 h-8">
          <RegistryIcon />
        </div>

        <div className="flex flex-col items-start">
          <span className="text-h1 dark:text-text-input">
            {abbreviateNumber(registries)}
          </span>
          <span className="text-p1">Total registries</span>
        </div>
      </div>
      <div className="w-px min-h-[120px] dark:bg-bg-grid-border" />
      <div className="col-span-7">
        <div className="gap-16 flex justify-center">
          <div className="col-span-4 flex items-center dark:text-text-text-and-icon gap-x-3 justify-center">
            <div className="w-8 h-8">
              <ImageIcon />
            </div>

            <div className="flex flex-col items-start">
              <span className="text-h1 dark:text-text-input">
                {abbreviateNumber(images)}
              </span>
              <span className="text-p1">Total images</span>
            </div>
          </div>
          <div className="col-span-4 flex items-center dark:text-text-text-and-icon gap-x-3 justify-center">
            <div className="w-8 h-8">
              <TagsIcon />
            </div>

            <div className="flex flex-col items-start">
              <span className="text-h1 dark:text-text-input">
                {abbreviateNumber(tags)}
              </span>
              <span className="text-p1">Total tags</span>
            </div>
          </div>
          <div className="col-span-4 flex items-center dark:text-text-text-and-icon gap-x-3 justify-center">
            <div className="w-8 h-8">
              <SuccessIcon />
            </div>

            <div className="flex flex-col items-start">
              <span className="text-h1 dark:text-text-input">
                {abbreviateNumber(scans_complete)}
              </span>
              <span className="text-p1">Completed</span>
            </div>
          </div>
          <div className="col-span-4 flex items-center dark:text-text-text-and-icon gap-x-3 justify-center">
            <div className="w-8 h-8">
              <InProgressIcon />
            </div>

            <div className="flex flex-col items-start">
              <span className="text-h1 dark:text-text-input">
                {abbreviateNumber(scans_in_progress)}
              </span>
              <span className="text-p1">In Progress</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
const Widgets = () => {
  return (
    <Card className="min-h-[140px] px-4 py-1.5">
      <div className="flex-1">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[100px]">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <CountWidget />
        </Suspense>
      </div>
    </Card>
  );
};

const RegistryAccountsResults = () => {
  const [selectedScanType, setSelectedScanType] = useState<
    | typeof ScanTypeEnum.VulnerabilityScan
    | typeof ScanTypeEnum.SecretScan
    | typeof ScanTypeEnum.MalwareScan
  >();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string>('');
  const fetcher = useFetcher<ActionData>();

  const onTableAction = useCallback(
    (id: string, scanType: RegistryScanType, actionType: string) => {
      if (actionType === ActionEnumType.START_SCAN) {
        setSelectedScanType(scanType);
        return;
      }
      const formData = new FormData();
      formData.append('actionType', actionType);
      formData.append('nodeIds', id);

      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [fetcher],
  );

  return (
    <>
      <ConfigureScanModal
        open={!!selectedScanType}
        onOpenChange={() => setSelectedScanType(undefined)}
        scanOptions={
          selectedScanType ? getScanOptions(selectedScanType, idsToDelete) : undefined
        }
      />
      <Suspense fallback={<TableSkeleton columns={7} rows={10} />}>
        <RegistryAccountsTable
          onTableAction={onTableAction}
          setShowDeleteDialog={setShowDeleteDialog}
          setIdsToDelete={setIdsToDelete}
        />
      </Suspense>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          id={idsToDelete}
          setShowDialog={setShowDeleteDialog}
          fetcher={fetcher}
          onTableAction={onTableAction}
        />
      )}
    </>
  );
};

const RegistryAccounts = () => {
  return (
    <>
      <Header />
      <div className="p-4">
        <Widgets />
      </div>

      <div className="px-4 pb-4">
        <RegistryAccountsResults />
      </div>
    </>
  );
};

export const module = {
  action,
  element: <RegistryAccounts />,
};
