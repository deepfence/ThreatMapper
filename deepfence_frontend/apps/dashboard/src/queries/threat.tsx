import { createQueryKeys } from '@lukemorales/query-key-factory';

import { getThreatGraphApiClient } from '@/api/api';
import {
  GraphIndividualThreatGraphRequestGraphTypeEnum,
  GraphIndividualThreatGraphRequestIssueTypeEnum,
  GraphThreatFiltersTypeEnum,
} from '@/api/generated';
import { apiWrapper } from '@/utils/api';

export const threatQueries = createQueryKeys('threat', {
  threatGraph: (params: {
    type: GraphThreatFiltersTypeEnum;
    cloudResourceOnly: boolean;
    awsAccountIds: string[];
    gcpAccountIds: string[];
    azureAccountIds: string[];
  }) => {
    return {
      queryKey: [params],
      queryFn: async () => {
        const { type, cloudResourceOnly, awsAccountIds, gcpAccountIds, azureAccountIds } =
          params;
        const getThreatGraphApi = apiWrapper({
          fn: getThreatGraphApiClient().getThreatGraph,
        });
        const threatGraph = await getThreatGraphApi({
          graphThreatFilters: {
            aws_filter: {
              account_ids: awsAccountIds,
            },
            azure_filter: {
              account_ids: azureAccountIds,
            },
            gcp_filter: { account_ids: gcpAccountIds },
            cloud_resource_only: cloudResourceOnly,
            type: type ?? 'all',
          },
        });

        if (!threatGraph.ok) {
          throw new Error('Error getting threatgraph');
        }

        return threatGraph.value;
      },
    };
  },
  individualThreatGraph: (params: {
    graphType?: GraphIndividualThreatGraphRequestGraphTypeEnum;
    issueType: GraphIndividualThreatGraphRequestIssueTypeEnum;
    nodeIds?: string[];
  }) => {
    return {
      queryKey: [params],
      queryFn: async () => {
        const {
          graphType = GraphIndividualThreatGraphRequestGraphTypeEnum.MostVulnerableAttackPaths,
          issueType,
          nodeIds,
        } = params;
        const getIndividualThreatGraph = apiWrapper({
          fn: getThreatGraphApiClient().getIndividualThreatGraph,
        });

        const getVulnerabilityThreatGraphResponse = await getIndividualThreatGraph({
          graphIndividualThreatGraphRequest: {
            graph_type: graphType,
            issue_type: issueType,
            node_ids: nodeIds,
          },
        });

        if (!getVulnerabilityThreatGraphResponse.ok) {
          throw getVulnerabilityThreatGraphResponse.error;
        }

        return getVulnerabilityThreatGraphResponse.value;
      },
    };
  },
});
