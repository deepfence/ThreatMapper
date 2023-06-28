import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useCallback, useState } from 'react';
import { ActionFunctionArgs, Outlet, useFetcher } from 'react-router-dom';
import { Breadcrumb, BreadcrumbLink, Button, TableSkeleton } from 'ui-components';

import { getReportsApiClient } from '@/api/api';
import { UtilsReportFiltersNodeTypeEnum } from '@/api/generated';
import { ModelExportReport } from '@/api/generated/models/ModelExportReport';
import { DFLink } from '@/components/DFLink';
import { PlusIcon } from '@/components/icons/common/Plus';
import { complianceType } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { IntegrationsIcon } from '@/components/sideNavigation/icons/Integrations';
import { DeleteConfirmationModal } from '@/features/integrations/components/DeleteConfirmationModal';
import { ReportTable } from '@/features/integrations/components/ReportsTable';
import { queries } from '@/queries';
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
    case 'Aws':
      return complianceType.aws;
    case 'Google':
      return complianceType.gcp;
    case 'Azure':
      return complianceType.azure;
    case 'Host':
      return complianceType.host;
    case 'Kubernetes':
      return complianceType.kubernetes_cluster;
    default:
      console.error('Provider type should be matched');
      return [];
  }
};
export const getReportNodeType = (resourceType: string) => {
  if (resourceType === 'CloudCompliance') {
    return {
      Aws: UtilsReportFiltersNodeTypeEnum.Aws,
      Azure: UtilsReportFiltersNodeTypeEnum.Azure,
      Gcp: UtilsReportFiltersNodeTypeEnum.Gcp,
    };
  } else if (resourceType === 'Compliance') {
    return {
      Host: UtilsReportFiltersNodeTypeEnum.Host,
      Kubernetes: UtilsReportFiltersNodeTypeEnum.Cluster,
    };
  }
  return {
    Host: UtilsReportFiltersNodeTypeEnum.Host,
    Container: UtilsReportFiltersNodeTypeEnum.Container,
    ContainerImage: UtilsReportFiltersNodeTypeEnum.ContainerImage,
  };
};

export const useGetReports = () => {
  return useSuspenseQuery({
    ...queries.integration.getReports(),
    keepPreviousData: true,
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
        message: 'An id is required to delete an integration',
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
        return {
          message: r.error.message ?? 'Error in deleting report',
          success: false,
        };
      }
    }

    return {
      deleteSuccess: true,
    };
  }

  return null;
};

const Header = () => {
  return (
    <div className="flex pl-6 pr-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
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
  const fetcher = useFetcher<ActionData>();

  const onTableAction = useCallback((row: ModelExportReport, actionType: string) => {
    if (actionType === ActionEnumType.DELETE) {
      setModelRow(row);
      setShowDeleteDialog(true);
    } else if (actionType === ActionEnumType.CONFIRM_DELETE) {
      const formData = new FormData();
      formData.append('actionType', actionType);
      formData.append('id', row.report_id ?? '');

      fetcher.submit(formData, {
        method: 'post',
      });
    } else if (actionType === ActionEnumType.DOWNLOAD) {
      download(row.url ?? '');
    }
  }, []);

  return (
    <>
      <Header />
      <div className="m-4">
        <Button
          variant="outline"
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
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          row={modelRow}
          setShowDialog={setShowDeleteDialog}
          onTableAction={onTableAction}
          fetcher={fetcher}
        />
      </div>
      <Outlet />
    </>
  );
};

export const module = {
  element: <DownloadReport />,
  action,
};
