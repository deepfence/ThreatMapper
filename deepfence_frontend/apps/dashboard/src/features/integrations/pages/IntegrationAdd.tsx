import { ActionFunctionArgs, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { getIntegrationApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelIntegrationListResp,
  ModelNodeIdentifier,
  ModelNodeIdentifierNodeTypeEnum,
  ReportersFieldsFilters,
} from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';

import { IntegrationForm, IntegrationType } from '../components/IntegrationForm';
import { IntegrationTable } from '../components/IntegrationTable';

type ActionReturnType = {
  message?: string;
  success: boolean;
};

type LoaderDataType = {
  data: ReturnType<typeof getIntegrations>;
};

export const CLOUD_TRAIL_ALERT = 'CloudTrail Alert';
export const USER_ACTIVITIES = 'User Activities';

export enum ActionEnumType {
  DELETE = 'delete',
  ADD = 'add',
}
const severityMap: {
  [key: string]: string;
} = {
  Vulnerability: 'cve_severity',
  Secret: 'level',
  Malware: 'file_severity',
  Compliance: 'status',
};
const getIntegrations = async (): Promise<{
  message?: string;
  data?: ModelIntegrationListResp[];
}> => {
  const integrationPromise = await makeRequest({
    apiFunction: getIntegrationApiClient().listIntegration,
    apiArgs: [],
  });

  if (ApiError.isApiError(integrationPromise)) {
    return {
      message: 'Error in getting integrations',
    };
  }

  return {
    data: integrationPromise,
  };
};

export const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getIntegrations(),
  });
};

const getConfigBodyNotificationType = (formData: FormData, integrationType: string) => {
  const formBody = Object.fromEntries(formData);

  switch (integrationType) {
    case IntegrationType.slack:
      return {
        webhook_url: formBody.url,
        channel: formBody.channelName,
      };
    case IntegrationType.pagerDuty:
      return {
        service_key: formBody.integrationKey,
        api_key: formBody.apiKey,
      };
    case IntegrationType.microsoftTeams:
      return {
        webhook_url: formBody.url,
      };
    case IntegrationType.httpEndpoint:
      return {
        url: formBody.apiUrl,
        auth_key: formBody.authorizationKey,
      };
    case IntegrationType.email:
      return {
        email_id: formBody.email,
      };
    case IntegrationType.splunk:
      return {
        endpoint_url: formBody.url,
        token: formBody.token,
      };
    case IntegrationType.elasticsearch:
      return {
        endpoint_url: formBody.url,
        index: formBody.index,
        auth_header: formBody.authKey,
        docType: formBody.docType,
      };
    case IntegrationType.sumoLogic:
      return {
        endpoint_url: formBody.url,
      };
    case IntegrationType.googleChronicle:
      return {
        url: formBody.url,
        auth_header: formBody.authKey,
      };
    case IntegrationType.awsSecurityHub:
      return {
        aws_access_key: formBody.accessKey,
        aws_secret_key: formBody.secretKey,
        aws_region: formBody.region,
      };
    case IntegrationType.jira: {
      const authTypeRadio = formBody.authTypeRadio;
      if (authTypeRadio === 'apiToken') {
        return {
          jiraSiteUrl: formBody.url,
          isAuthToken: true,
          api_token: formBody.authType,
          username: formBody.email,
          jiraProjectKey: formBody.accessKey,
          issueType: formBody.task,
          jiraAssignee: formBody.assigne,
        };
      }
      return {
        jiraSiteUrl: formBody.url,
        isAuthToken: false,
        password: formBody.authType,
        username: formBody.email,
        jiraProjectKey: formBody.accessKey,
        issueType: formBody.task,
        jiraAssignee: formBody.assigne,
      };
    }
    case IntegrationType.s3:
      return {
        s3_bucket_name: formBody.name,
        aws_access_key: formBody.accessKey,
        aws_secret_key: formBody.secretKey,
        s3_folder_name: formBody.folder,
        aws_region: formBody.region,
      };
    default:
      break;
  }
};

const action = async ({
  request,
  params,
}: ActionFunctionArgs): Promise<{
  message?: string;
  deleteSuccess?: boolean;
} | null> => {
  const _integrationType = params.integrationType?.toString();
  const formData = await request.formData();
  let _notificationType = formData.get('_notificationType')?.toString();
  const _actionType = formData.get('_actionType')?.toString();

  if (!_actionType) {
    return {
      message: 'Action Type is required',
    };
  }

  if (_actionType === ActionEnumType.ADD) {
    if (!_integrationType) {
      return {
        message: 'Integration Type is required',
      };
    }
    if (!_notificationType) {
      return {
        message: 'Notification Type is required',
      };
    }

    if (_notificationType === 'CloudTrail Alert') {
      _notificationType = 'CloudTrailAlert';
    } else if (_notificationType === 'User Activities') {
      _notificationType = 'UserActivities';
    }

    // filters
    const statusFilter = formData.getAll('statusFilter') as string[];
    const severityFilter = formData.getAll('severityFilter') as string[];
    const intervalFilter = formData.get('interval')?.toString();

    // host filter
    const selectedHostLength = Number(formData.get('selectedHostLength'));
    const hostFilter = [];
    if (selectedHostLength > 0) {
      for (let i = 0; i < selectedHostLength; i++) {
        hostFilter.push(formData.get(`hostFilter[${i}]`) as string);
      }
    }
    // container filter
    const selectedContainerLength = Number(formData.get('selectedContainerLength'));
    const containerFilter = [];
    if (selectedContainerLength > 0) {
      for (let i = 0; i < selectedContainerLength; i++) {
        containerFilter.push(formData.get(`containerFilter[${i}]`) as string);
      }
    }

    // image filter
    const selectedImageLength = Number(formData.get('selectedImageLength'));
    const imageFilter = [];
    if (selectedImageLength > 0) {
      for (let i = 0; i < selectedImageLength; i++) {
        imageFilter.push(formData.get(`imageFilter[${i}]`) as string);
      }
    }

    // cluster filter
    const selectedClusterLength = Number(formData.get('selectedClusterLength'));
    const clusterFilter = [];
    if (selectedClusterLength > 0) {
      for (let i = 0; i < selectedClusterLength; i++) {
        clusterFilter.push(formData.get(`clusterFilter[${i}]`) as string);
      }
    }

    const _filters: {
      node_ids: ModelNodeIdentifier[];
      fields_filters: ReportersFieldsFilters;
    } = {
      fields_filters: {
        compare_filter: null,
        contains_filter: { filter_in: {} },
        match_filter: { filter_in: null },
        order_filter: {
          order_fields: null,
        },
      },
      node_ids: [],
    };

    const nodeIds = [];

    if (hostFilter.length) {
      const _hosts: ModelNodeIdentifier[] = hostFilter.map<ModelNodeIdentifier>((id) => {
        return {
          node_id: id,
          node_type: ModelNodeIdentifierNodeTypeEnum.Host,
        };
      });
      nodeIds.push(..._hosts);
    }
    if (imageFilter.length) {
      const _images: ModelNodeIdentifier[] = imageFilter.map<ModelNodeIdentifier>(
        (id) => {
          return {
            node_id: id,
            node_type: ModelNodeIdentifierNodeTypeEnum.Image,
          };
        },
      );
      nodeIds.push(..._images);
    }
    if (containerFilter.length) {
      const _containers: ModelNodeIdentifier[] = containerFilter.map<ModelNodeIdentifier>(
        (id) => {
          return {
            node_id: id,
            node_type: ModelNodeIdentifierNodeTypeEnum.Container,
          };
        },
      );
      nodeIds.push(..._containers);
    }
    if (clusterFilter.length) {
      const _clusters: ModelNodeIdentifier[] = clusterFilter.map<ModelNodeIdentifier>(
        (id) => {
          return {
            node_id: id,
            node_type: ModelNodeIdentifierNodeTypeEnum.Cluster,
          };
        },
      );
      nodeIds.push(..._clusters);
    }
    if (severityFilter.length) {
      const filters = _filters.fields_filters.contains_filter.filter_in;
      const newFilter = {
        ...filters,
        [severityMap[_notificationType] || 'severity']: severityFilter.map((severity) =>
          severity.toLowerCase(),
        ),
      };
      _filters.fields_filters.contains_filter.filter_in = newFilter;
    }
    if (statusFilter.length) {
      const filters = _filters.fields_filters.contains_filter.filter_in;
      const newFilter = {
        ...filters,
        status: statusFilter.map((status) => status.toLowerCase()),
      };
      _filters.fields_filters.contains_filter.filter_in = newFilter;
    }
    if (intervalFilter) {
      // TODO Add filters
    }

    _filters.node_ids = nodeIds;

    const r = await makeRequest({
      apiFunction: getIntegrationApiClient().addIntegration,
      apiArgs: [
        {
          modelIntegrationAddReq: {
            integration_type: _integrationType,
            notification_type: _notificationType,
            config: getConfigBodyNotificationType(formData, _integrationType as string),
            filters: _filters,
          },
        },
      ],
      errorHandler: async (r) => {
        const error = new ApiError<ActionReturnType>({
          success: false,
        });
        if (r.status === 400) {
          const modelResponse: ApiDocsBadRequestResponse = await r.json();
          return error.set({
            message: modelResponse.message ?? '',
            success: false,
          });
        }
      },
    });
    if (ApiError.isApiError(r)) {
      return r.value();
    }
    toast('Integration added successfully');
  } else if (_actionType === ActionEnumType.DELETE) {
    const id = formData.get('id')?.toString();
    if (!id) {
      return {
        deleteSuccess: false,
        message: 'An id is required to delete an integration',
      };
    }
    const r = await makeRequest({
      apiFunction: getIntegrationApiClient().deleteIntegration,
      apiArgs: [
        {
          integrationId: id,
        },
      ],
      errorHandler: async (r) => {
        const error = new ApiError<ActionReturnType>({
          success: false,
        });
        if (r.status === 400) {
          const modelResponse: ApiDocsBadRequestResponse = await r.json();
          return error.set({
            message: modelResponse.message ?? '',
            success: false,
          });
        }
      },
    });
    if (ApiError.isApiError(r)) {
      return {
        message: 'Error in adding integrations',
      };
    }
    toast('Integration deleted successfully');
    return {
      deleteSuccess: true,
    };
  }

  return null;
};

const IntegrationAdd = () => {
  const { integrationType } = useParams() as {
    integrationType: string;
  };

  if (!integrationType) {
    throw new Error('Integration Type is required');
  }

  return (
    <div className="grid grid-cols-[310px_1fr] gap-x-2">
      <IntegrationForm integrationType={integrationType} />
      <IntegrationTable />
    </div>
  );
};

export const module = {
  element: <IntegrationAdd />,
  action,
  loader,
};
