import { ActionFunctionArgs } from 'react-router-dom';
import { toast } from 'sonner';

import { getCloudNodesApiClient } from '@/api/api';
import { invalidateAllQueries } from '@/queries';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';

type ActionReturnType = {
  message?: string;
  success: boolean;
};

export const starteBPFApiAction = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const nodeIds = (formData.getAll('nodeIds[]') ?? []) as string[];

  const deployCloudResourceAgentApi = apiWrapper({
    fn: getCloudNodesApiClient().deployCloudResourceAgent,
  });
  const startComplianceScanResponse = await deployCloudResourceAgentApi({
    modelCloudResourceDeployAgentReq: {
      node_ids: nodeIds,
    },
  });

  if (!startComplianceScanResponse.ok) {
    if (
      startComplianceScanResponse.error.response.status === 400 ||
      startComplianceScanResponse.error.response.status === 409
    ) {
      return {
        success: false,
        message: startComplianceScanResponse.error.message ?? '',
      };
    } else if (startComplianceScanResponse.error.response.status === 403) {
      const message = await get403Message(startComplianceScanResponse.error);
      return {
        success: false,
        message,
      };
    }
    throw startComplianceScanResponse.error;
  }
  invalidateAllQueries();
  toast.success('Started sucessfully');
  return {
    success: true,
  };
};
