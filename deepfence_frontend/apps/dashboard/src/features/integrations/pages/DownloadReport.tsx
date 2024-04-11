import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionFunctionArgs,
  Outlet,
  useFetcher,
  useSearchParams,
} from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  BreadcrumbLink,
  Button,
  Modal,
  RowSelectionState,
  TableSkeleton,
} from 'ui-components';

import { getReportsApiClient } from '@/api/api';
import {
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { ModelExportReport } from '@/api/generated/models/ModelExportReport';
import { DFLink } from '@/components/DFLink';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { FilterIcon } from '@/components/icons/common/Filter';
import { PlusIcon } from '@/components/icons/common/Plus';
import { complianceType } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { IntegrationsIcon } from '@/components/sideNavigation/icons/Integrations';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import {
  getReportDownloadAppliedFiltersCount,
  ReportFilters,
  ReportTable,
} from '@/features/integrations/components/ReportsTable';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { download } from '@/utils/download';
import { usePageNavigation } from '@/utils/usePageNavigation';

export enum ActionEnumType {
  DELETE = 'delete',
  CONFIRM_DELETE = 'confirm_delete',
  DOWNLOAD = 'download',
  ADD = 'add',
}
export const getReportBenchmarkList = (nodeType: string) => {
  switch (nodeType) {
    case UtilsReportFiltersNodeTypeEnum.Aws:
      return complianceType.aws;
    case UtilsReportFiltersNodeTypeEnum.Gcp:
      return complianceType.gcp;
    case UtilsReportFiltersNodeTypeEnum.Azure:
      return complianceType.azure;
    case UtilsReportFiltersNodeTypeEnum.Host:
      return complianceType.host;
    case UtilsReportFiltersNodeTypeEnum.Cluster:
      return complianceType.kubernetes_cluster;
    default:
      console.error('Provider type should be matched');
      return [];
  }
};

export const getReportNodeType = (resourceType: string) => {
  if (resourceType === UtilsReportFiltersScanTypeEnum.CloudCompliance) {
    return [
      UtilsReportFiltersNodeTypeEnum.Aws,
      UtilsReportFiltersNodeTypeEnum.Azure,
      UtilsReportFiltersNodeTypeEnum.Gcp,
    ];
  } else if (resourceType === UtilsReportFiltersScanTypeEnum.Compliance) {
    return [UtilsReportFiltersNodeTypeEnum.Host, UtilsReportFiltersNodeTypeEnum.Cluster];
  }
  return [
    UtilsReportFiltersNodeTypeEnum.Host,
    UtilsReportFiltersNodeTypeEnum.Container,
    UtilsReportFiltersNodeTypeEnum.ContainerImage,
  ];
};

export const useGetReports = () => {
  return useSuspenseQuery({
    ...queries.integration.getReports(),
  });
};
export type ActionData = {
  action: ActionEnumType;
  message?: string;
  success?: boolean;
  deleteSuccess?: boolean;
} | null;

const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  const _actionType = formData.get('_actionType')?.toString();

  if (!_actionType) {
    return {
      message: 'Action Type is required',
      action: _actionType as ActionEnumType,
    };
  }

  if (_actionType === ActionEnumType.DELETE) {
    const reportIds = formData.getAll('reportIds[]');
    if (!reportIds || reportIds.length <= 0) {
      return {
        deleteSuccess: false,
        message: 'Id is required to delete an integration',
        action: _actionType as ActionEnumType,
      };
    }
    const deleteReportApi = apiWrapper({
      fn: getReportsApiClient().bulkDeleteReports,
    });
    const r = await deleteReportApi({
      modelBulkDeleteReportReq: {
        report_ids: reportIds as string[],
      },
    });
    if (!r.ok) {
      if (r.error.response.status === 400) {
        const { message } = await getResponseErrors(r.error);
        return {
          message: message ?? 'Error in deleting report',
          success: false,
          action: _actionType as ActionEnumType,
        };
      } else if (r.error.response.status === 403) {
        const message = await get403Message(r.error);
        return {
          message,
          success: false,
          action: _actionType as ActionEnumType,
        };
      }
      throw r.error;
    }
    invalidateAllQueries();
    return {
      deleteSuccess: true,
      action: _actionType as ActionEnumType,
    };
  }

  return null;
};

const DeleteConfirmationModal = ({
  showDialog,
  reportIds,
  setShowDialog,
  onDeleteSuccess,
}: {
  showDialog: boolean;
  reportIds: string[] | undefined;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onDeleteSuccess: () => void;
}) => {
  const fetcher = useFetcher<ActionData>();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('_actionType', actionType);
      reportIds?.forEach((item) => formData.append('reportIds[]', item));

      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [fetcher, reportIds],
  );

  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data?.deleteSuccess &&
      fetcher.data.action === ActionEnumType.DELETE
    ) {
      onDeleteSuccess();
    }
  }, [fetcher]);

  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => {
        setShowDialog(false);
      }}
      title={
        !fetcher.data?.deleteSuccess ? (
          <div className="flex gap-3 items-center text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Delete report
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.deleteSuccess ? (
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
      {!fetcher.data?.deleteSuccess ? (
        <div className="grid">
          <span>The selected report will be deleted.</span>
          <br />
          <span>Are you sure you want to delete?</span>
          {fetcher.data?.message ? (
            <p className="mt-2 text-status-error text-p7">{fetcher.data?.message}</p>
          ) : null}
        </div>
      ) : (
        <SuccessModalContent text="Deleted successfully!" />
      )}
    </Modal>
  );
};

const Header = () => {
  return (
    <BreadcrumbWrapper>
      <>
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<IntegrationsIcon />} isLink>
            <DFLink to={'/integrations'} unstyled>
              Integrations
            </DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">Reports</span>
          </BreadcrumbLink>
        </Breadcrumb>
      </>
    </BreadcrumbWrapper>
  );
};

const DownloadReport = () => {
  const { navigate } = usePageNavigation();
  const [reportIdsToDelete, setReportIdsToDelete] = useState<string[]>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fetcher = useFetcher<ActionData>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});

  const selectdDeleteableRow = useMemo<
    {
      status: string;
      id: string;
    }[]
  >(() => {
    return Object.keys(rowSelectionState)
      .map((item) => {
        return JSON.parse(item);
      })
      .filter((value) => {
        return (
          value.status?.toLowerCase() === 'complete' ||
          value.status?.toLowerCase() === 'error'
        );
      });
  }, [rowSelectionState]);

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [searchParams] = useSearchParams();

  const onTableAction = useCallback((row: ModelExportReport, actionType: string) => {
    if (actionType === ActionEnumType.DELETE) {
      if (!row.report_id) {
        console.error('No report id to delete');
        return;
      }
      setReportIdsToDelete([row.report_id]);
      setShowDeleteDialog(true);
    } else if (actionType === ActionEnumType.DOWNLOAD) {
      download(row.url ?? '');
    }
  }, []);

  return (
    <>
      <Header />
      <div className="m-4">
        <div className="flex">
          <Button
            variant="flat"
            startIcon={<PlusIcon />}
            onClick={() => {
              navigate(`./create?${searchParams.toString()}`);
            }}
            size="sm"
          >
            Create new report
          </Button>
          <Button
            size="md"
            variant="flat"
            color="error"
            loading={fetcher.state === 'submitting'}
            disabled={selectdDeleteableRow.length === 0 || fetcher.state === 'submitting'}
            onClick={(e) => {
              e.preventDefault();
              setReportIdsToDelete(selectdDeleteableRow.map((row) => row.id));
              setShowDeleteDialog(true);
            }}
          >
            Delete
          </Button>
          <Button
            variant="flat"
            className="ml-auto"
            startIcon={<FilterIcon />}
            endIcon={
              getReportDownloadAppliedFiltersCount(searchParams) > 0 ? (
                <Badge
                  label={String(getReportDownloadAppliedFiltersCount(searchParams))}
                  variant="filled"
                  size="small"
                  color="blue"
                />
              ) : null
            }
            size="sm"
            onClick={() => {
              setFiltersExpanded((prev) => !prev);
            }}
          >
            Filter
          </Button>
        </div>
        {filtersExpanded ? <ReportFilters /> : null}
        <Suspense fallback={<TableSkeleton columns={5} rows={10} />}>
          <ReportTable
            onTableAction={onTableAction}
            rowSelectionState={rowSelectionState}
            setRowSelectionState={setRowSelectionState}
          />
        </Suspense>
        {showDeleteDialog && (
          <DeleteConfirmationModal
            showDialog={showDeleteDialog}
            reportIds={reportIdsToDelete}
            setShowDialog={setShowDeleteDialog}
            onDeleteSuccess={() => {
              setRowSelectionState({});
            }}
          />
        )}
      </div>
      <Outlet />
    </>
  );
};

export const module = {
  element: <DownloadReport />,
  action,
};
