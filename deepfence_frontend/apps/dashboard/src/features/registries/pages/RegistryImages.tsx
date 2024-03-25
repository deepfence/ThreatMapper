import { useSuspenseQuery } from '@suspensive/react-query';
import { isEmpty } from 'lodash-es';
import { Suspense, useCallback, useState } from 'react';
import { generatePath, useParams, useSearchParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbLink,
  Button,
  Card,
  CircleSpinner,
  Dropdown,
  DropdownItem,
  RowSelectionState,
  TableSkeleton,
} from 'ui-components';

import { ModelSummary } from '@/api/generated/models/ModelSummary';
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { ImageIcon } from '@/components/icons/image';
import { InProgressIcon } from '@/components/icons/registries/InProgress';
import { StartScanIcon } from '@/components/icons/registries/StartScan';
import { TagsIcon } from '@/components/icons/registries/Tags';
import { RegistryIcon } from '@/components/sideNavigation/icons/Registry';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import { RegistryImagesTable } from '@/features/registries/components/RegistryImagesTable';
import { queries } from '@/queries';
import {
  MalwareScanNodeTypeEnum,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';
import { abbreviateNumber } from '@/utils/number';
import { getOrderFromSearchParams, getPageFromSearchParams } from '@/utils/table';

export enum ActionEnumType {
  START_SCAN = 'start_scan',
}
export type RegistryScanType =
  | typeof ScanTypeEnum.VulnerabilityScan
  | typeof ScanTypeEnum.SecretScan
  | typeof ScanTypeEnum.MalwareScan;

const DEFAULT_PAGE_SIZE = 10;

export const useListImages = () => {
  const [searchParams] = useSearchParams();
  const params = useParams() as {
    nodeId: string;
  };
  const nodeId = params?.nodeId;

  return useSuspenseQuery({
    ...queries.registry.listImages({
      registryId: nodeId,
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      order: getOrderFromSearchParams(searchParams) || {
        sortBy: 'id',
        descending: true,
      },
    }),
    keepPreviousData: true,
  });
};

const useImageSummary = () => {
  const params = useParams() as {
    nodeId: string;
  };
  const nodeId = params?.nodeId;

  return useSuspenseQuery({
    ...queries.registry.getImageSummary({
      registryId: nodeId,
    }),
  });
};

const useRegistryDetails = () => {
  const params = useParams() as {
    nodeId: string;
  };
  const nodeId = params?.nodeId;
  return useSuspenseQuery({
    ...queries.lookup.registryAccount({
      nodeIds: [nodeId],
    }),
  });
};

function getScanOptions(
  scanType: ScanTypeEnum,
  nodeIds: string[],
  images: string[],
): ConfigureScanModalProps['scanOptions'] {
  if (scanType === ScanTypeEnum.VulnerabilityScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodes: nodeIds.map((nodeId) => {
          return {
            nodeId: nodeId,
            nodeType: VulnerabilityScanNodeTypeEnum.image,
          };
        }),
        images,
      },
    };
  }

  if (scanType === ScanTypeEnum.SecretScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodes: nodeIds.map((nodeId) => {
          return {
            nodeId: nodeId,
            nodeType: SecretScanNodeTypeEnum.image,
          };
        }),
        images,
      },
    };
  }

  if (scanType === ScanTypeEnum.MalwareScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodes: nodeIds.map((nodeId) => {
          return {
            nodeId: nodeId,
            nodeType: MalwareScanNodeTypeEnum.image,
          };
        }),
        images,
      },
    };
  }

  throw new Error('invalid scan type');
}

const Header = () => {
  return (
    <BreadcrumbWrapper>
      <>
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<RegistryIcon />} isLink>
            <DFLink to={'/registries'} unstyled>
              Registries
            </DFLink>
          </BreadcrumbLink>
          <Suspense
            fallback={
              <BreadcrumbLink isLast>
                <CircleSpinner size="sm" />
              </BreadcrumbLink>
            }
          >
            <DynamicBreadcrumbs />
          </Suspense>
        </Breadcrumb>
      </>
    </BreadcrumbWrapper>
  );
};
const DynamicBreadcrumbs = () => {
  const { account, nodeId } = useParams() as {
    account: string;
    nodeId: string;
  };

  const { data } = useRegistryDetails();

  return (
    <>
      <BreadcrumbLink>
        <DFLink
          to={generatePath('/registries/:account', {
            account: encodeURIComponent(account),
          })}
        >
          {account}
        </DFLink>
      </BreadcrumbLink>
      <BreadcrumbLink isLast>
        <span className="inherit cursor-auto">{data.data?.[0]?.name ?? nodeId}</span>
      </BreadcrumbLink>
    </>
  );
};

const BulkActions = ({
  ids,
  onTableAction,
}: {
  ids: string[];
  onTableAction: (ids: string[], scanType: RegistryScanType, actionType: string) => void;
}) => {
  return (
    <>
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

const RegistryImagesResults = () => {
  const [selectedScanType, setSelectedScanType] = useState<RegistryScanType>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [nodeIdsToScan, setNodeIdsToScan] = useState<string[]>([]);

  const params = useParams() as {
    nodeId: string;
  };

  const onTableAction = useCallback(
    (nodeIds: string[], scanType: RegistryScanType, actionType: string) => {
      setNodeIdsToScan(nodeIds);
      setSelectedScanType(scanType);
    },
    [],
  );

  return (
    <div className="self-start">
      <div className="h-12 flex items-center">
        <BulkActions ids={Object.keys(rowSelectionState)} onTableAction={onTableAction} />
        <ConfigureScanModal
          open={!!selectedScanType}
          onOpenChange={() => setSelectedScanType(undefined)}
          scanOptions={
            selectedScanType
              ? getScanOptions(selectedScanType, [params.nodeId], nodeIdsToScan)
              : undefined
          }
        />
      </div>
      <Suspense fallback={<TableSkeleton columns={7} rows={10} />}>
        <RegistryImagesTable
          onTableAction={onTableAction}
          rowSelectionState={rowSelectionState}
          setRowSelectionState={setRowSelectionState}
        />
      </Suspense>
    </div>
  );
};

const CountWidget = () => {
  const { data } = useImageSummary();

  if (isEmpty(data.summary)) {
    return (
      <div className="w-full text-md text-gray-900 dark:text-text-white">No data</div>
    );
  }

  const {
    repositories = 0,
    images = 0,
    scans_in_progress = 0,
  } = data.summary as ModelSummary;

  return (
    <div className="grid grid-cols-12 px-6 items-center w-full">
      <div className="col-span-4 flex items-center text-text-text-and-icon gap-x-3 justify-center">
        <div className="w-8 h-8 text-text-icon">
          <ImageIcon />
        </div>

        <div className="flex flex-col items-start">
          <span
            className="text-h1 dark:text-text-input-value"
            data-testid="totalRegistryImagesId"
          >
            {abbreviateNumber(repositories)}
          </span>
          <span className="text-p1a">Total repositories</span>
        </div>
      </div>

      <div className="col-span-4 flex items-center text-text-text-and-icon gap-x-3 justify-center">
        <div className="w-8 h-8 text-text-icon">
          <TagsIcon />
        </div>

        <div className="flex flex-col items-start">
          <span
            className="text-h1 dark:text-text-input-value"
            data-testid="totalRegistryImageTagsId"
          >
            {abbreviateNumber(images)}
          </span>
          <span className="text-p1a">Total images</span>
        </div>
      </div>
      <div className="col-span-4 flex items-center text-text-text-and-icon gap-x-3 justify-center">
        <div className="w-8 h-8 text-text-icon">
          <InProgressIcon />
        </div>

        <div className="flex flex-col items-start">
          <span className="text-h1 text-text-input-value">
            {abbreviateNumber(scans_in_progress)}
          </span>
          <span className="text-p1a">In progress</span>
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
const RegistryImages = () => {
  return (
    <>
      <Header />
      <div className="m-4">
        <Widgets />
        <div className="py-4">
          <RegistryImagesResults />
        </div>
      </div>
    </>
  );
};

export const module = {
  element: <RegistryImages />,
};
