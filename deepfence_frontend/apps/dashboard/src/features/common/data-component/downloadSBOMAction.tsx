import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';

import { getReportsApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelGenerateReportReqReportTypeEnum,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
  UtilsReportOptionsSbomFormatEnum,
} from '@/api/generated';
import { get403Message } from '@/utils/403';
import { apiWrapper, retryUntilResponseHasValue } from '@/utils/api';
import { download } from '@/utils/download';

export const action = async ({ request }: ActionFunctionArgs): Promise<null> => {
  const formData = await request.formData();
  let nodeType = formData.get('nodeType') as UtilsReportFiltersNodeTypeEnum | 'image';
  const scanId = formData.get('scanId')?.toString() ?? '';
  const scanType = formData.get('scanType') as UtilsReportFiltersScanTypeEnum;
  const format = formData.get('format') as UtilsReportOptionsSbomFormatEnum;

  if (!nodeType) {
    throw new Error('Node Type is required');
  }

  if (nodeType === 'image') {
    nodeType = UtilsReportFiltersNodeTypeEnum.ContainerImage;
  }

  const getReportIdApi = apiWrapper({
    fn: getReportsApiClient().generateReport,
  });

  const getReportIdApiResponse = await getReportIdApi({
    modelGenerateReportReq: {
      filters: {
        node_type: nodeType,
        scan_type: scanType,
        scan_id: scanId,
      },
      options: {
        sbom_format: format,
      },
      report_type: ModelGenerateReportReqReportTypeEnum.Sbom,
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
    } else if (getReportIdApiResponse.error.response.status === 403) {
      const message = await get403Message(getReportIdApiResponse.error);
      toast.error(message);
      return null;
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
    async (response, showToast) => {
      if (response.ok) {
        if (response.value.status === 'ERROR') {
          toast.error(
            'Download failed, please find more details on Integrations > Report Downloads',
          );
          return true;
        }
        const url = response.value.url;
        if (!url && showToast) {
          toast.message(
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
    true,
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

export const useDownloadSBOM = () => {
  const fetcher = useFetcher<null>();

  return {
    downloadingInFormat:
      fetcher.state === 'submitting' ? fetcher.formData?.get('format') : null,
    downloadSBOM: ({
      scanId,
      scanType,
      nodeType,
      format,
    }: {
      scanId: string;
      scanType: UtilsReportFiltersScanTypeEnum;
      nodeType: UtilsReportFiltersNodeTypeEnum;
      format: UtilsReportOptionsSbomFormatEnum;
    }) => {
      const formData = new FormData();
      formData.append('scanId', scanId);
      formData.append('scanType', scanType);
      formData.append('nodeType', nodeType);
      formData.append('format', format);
      fetcher.submit(formData, {
        action: '/data-component/sbom/download',
        method: 'post',
      });
    },
  };
};
