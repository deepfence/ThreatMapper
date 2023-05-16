import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';

import { getReportsApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelGenerateReportReqDurationEnum,
  ModelGenerateReportReqReportTypeEnum,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { apiWrapper, retryUntilResponseHasValue } from '@/utils/api';
import { download } from '@/utils/download';

export const action = async ({ request }: ActionFunctionArgs): Promise<null> => {
  const formData = await request.formData();
  const nodeType = formData.get('nodeType') as UtilsReportFiltersNodeTypeEnum;
  const scanId = formData.get('scanId')?.toString() ?? '';
  const scanType = formData.get('scanType') as UtilsReportFiltersScanTypeEnum;

  if (!nodeType) {
    throw new Error('Node Type is required');
  }

  const getReportIdApi = apiWrapper({
    fn: getReportsApiClient().generateReport,
  });

  const getReportIdApiResponse = await getReportIdApi({
    modelGenerateReportReq: {
      duration: ModelGenerateReportReqDurationEnum.NUMBER_0,
      filters: {
        node_type: nodeType,
        scan_type: scanType,
        scan_id: scanId,
      },
      report_type: ModelGenerateReportReqReportTypeEnum.Xlsx,
    },
  });

  if (!getReportIdApiResponse.ok) {
    if (getReportIdApiResponse.error.response.status === 400) {
      const modelResponse: ApiDocsBadRequestResponse =
        await getReportIdApiResponse.error.response.json();
      const error = modelResponse.error_fields?.message;
      if (error) {
        toast.error(error);
        return null;
      } else {
        toast.error('Something went wrong, please try again');
        return null;
      }
    }
    throw getReportIdApiResponse.error;
  }

  const reportId = getReportIdApiResponse.value.report_id;
  if (!reportId) {
    toast.error('Somethings went wrong, please try again');
    console.error('Report id is missing in api response');
    return null;
  }
  const getReportApi = apiWrapper({
    fn: getReportsApiClient().getReport,
  });

  const reportResponse = await retryUntilResponseHasValue(
    getReportApi,
    [{ reportId }],
    async (response) => {
      if (response.ok) {
        if (response.value.status === 'ERROR') {
          toast.error(
            'Download failed, please find more details on Integrations > Report Downloads',
          );
          return true;
        }
        const url = response.value.url;
        if (!url) {
          toast.success(
            'Download in progress, it may take some time however you can always find it on Integrations > Report Downloads',
          );
        }
        return !!url;
      } else {
        if (response.error.response.status === 400) {
          const modelResponse: ApiDocsBadRequestResponse =
            await response.error.response.json();
          const error = modelResponse.error_fields?.message;
          if (error) {
            toast.error(error);
            return true;
          }
        }
        toast.error('Something went wrong, please try again');
        return true;
      }
    },
  );

  if (reportResponse.ok) {
    const url = reportResponse.value.url;
    if (url) {
      download(url);
    } else {
      toast.error('Something went wrong, please try again');
    }
  }

  return null;
};

export const useDownloadScan = () => {
  const fetcher = useFetcher<null>();
  return {
    downloadScan: ({
      scanId,
      scanType,
      nodeType,
    }: {
      scanId: string;
      scanType: UtilsReportFiltersScanTypeEnum;
      nodeType: UtilsReportFiltersNodeTypeEnum;
    }) => {
      const formData = new FormData();
      formData.append('scanId', scanId);
      formData.append('scanType', scanType);
      formData.append('nodeType', nodeType);
      fetcher.submit(formData, {
        action: 'data-component/scan/download',
        method: 'post',
      });
    },
  };
};
