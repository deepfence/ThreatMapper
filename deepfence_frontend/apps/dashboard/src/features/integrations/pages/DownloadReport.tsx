import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useCallback, useState } from 'react';
import { ActionFunctionArgs, Outlet, useFetcher } from 'react-router-dom';
import { Breadcrumb, BreadcrumbLink, Button, Modal, TableSkeleton } from 'ui-components';

import { getReportsApiClient } from '@/api/api';
import {
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { ModelExportReport } from '@/api/generated/models/ModelExportReport';
import { DFLink } from '@/components/DFLink';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { PlusIcon } from '@/components/icons/common/Plus';
import { complianceType } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { IntegrationsIcon } from '@/components/sideNavigation/icons/Integrations';
import { ReportTable } from '@/features/integrations/components/ReportsTable';
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
    };
  }

  if (_actionType === ActionEnumType.DELETE) {
    const id = formData.get('id')?.toString();
    if (!id) {
      return {
        deleteSuccess: false,
        message: 'Id is required to delete an integration',
      };
    }
    const deleteReportApi = apiWrapper({
      fn: getReportsApiClient().deleteReport,
    });
    const r = await deleteReportApi({
      reportId: id,
    });
    if (!r.ok) {
      if (r.error.response.status === 400) {
        const { message } = await getResponseErrors(r.error);
        return {
          message: message ?? 'Error in deleting report',
          success: false,
        };
      } else if (r.error.response.status === 403) {
        const message = await get403Message(r.error);
        return {
          message,
          success: false,
        };
      }
      throw r.error;
    }
    invalidateAllQueries();
    return {
      deleteSuccess: true,
    };
  }

  return null;
};

const DeleteConfirmationModal = ({
  showDialog,
  row,
  setShowDialog,
}: {
  showDialog: boolean;
  row: ModelExportReport | undefined;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionData>();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('_actionType', actionType);
      formData.append('id', row?.report_id ?? '');

      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [fetcher, row],
  );

  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => {
        setShowDialog(false);
      }}
      title={
        !fetcher.data?.deleteSuccess ? (
          <div className="flex gap-3 items-center dark:text-status-error">
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
            <p className="mt-2 dark:text-status-error text-p7">{fetcher.data?.message}</p>
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
    <div className="flex pl-4 pr-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
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
    </div>
  );
};

const DownloadReport = () => {
  const { navigate } = usePageNavigation();
  const [modelRow, setModelRow] = useState<ModelExportReport>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const onTableAction = useCallback((row: ModelExportReport, actionType: string) => {
    if (actionType === ActionEnumType.DELETE) {
      setModelRow(row);
      setShowDeleteDialog(true);
    } else if (actionType === ActionEnumType.DOWNLOAD) {
      download(row.url ?? '');
    }
  }, []);

  return (
    <>
      <Header />
      <div className="m-4">
        <Button
          variant="flat"
          startIcon={<PlusIcon />}
          onClick={() => {
            navigate('./create');
          }}
          size="sm"
        >
          Create new report
        </Button>
        <Suspense fallback={<TableSkeleton columns={5} rows={10} />}>
          <ReportTable onTableAction={onTableAction} />
        </Suspense>
        {showDeleteDialog && (
          <DeleteConfirmationModal
            showDialog={showDeleteDialog}
            row={modelRow}
            setShowDialog={setShowDeleteDialog}
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
