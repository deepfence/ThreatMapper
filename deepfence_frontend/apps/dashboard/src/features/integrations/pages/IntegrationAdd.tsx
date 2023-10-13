import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { ActionFunctionArgs, useFetcher, useParams } from 'react-router-dom';
import {
  Button,
  Modal,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalHeader,
  TableSkeleton,
} from 'ui-components';

import { getIntegrationApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelIntegrationListResp,
  ModelNodeIdentifier,
  ModelNodeIdentifierNodeTypeEnum,
  ReportersFieldsFilters,
} from '@/api/generated';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { PlusIcon } from '@/components/icons/common/Plus';
import { integrationTypeToNameMapping } from '@/features/integrations/pages/Integrations';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { getArrayTypeValuesFromFormData } from '@/utils/formData';

import { IntegrationForm, IntegrationType } from '../components/IntegrationForm';
import { IntegrationTable } from '../components/IntegrationTable';

export const CLOUD_TRAIL_ALERT = 'CloudTrail Alert';
export const USER_ACTIVITIES = 'User Activities';

export enum ActionEnumType {
  DELETE = 'delete',
  ADD = 'add',
  CONFIRM_DELETE = 'confirm_delete',
}
const severityMap: {
  [key: string]: string;
} = {
  Vulnerability: 'cve_severity',
  Secret: 'level',
  Malware: 'file_severity',
  Compliance: 'status',
};

export const useListIntegrations = () => {
  return useSuspenseQuery({
    ...queries.integration.listIntegrations(),
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
        auth_header: formBody.auth_header,
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
    case IntegrationType.awsSecurityHub: {
      const selectedAccountsLength = Number(formData.get('selectedCloudAccountsLength'));
      const accounts = [];
      if (selectedAccountsLength > 0) {
        for (let i = 0; i < selectedAccountsLength; i++) {
          accounts.push(formData.get(`cloudAccountsFilter[${i}]`) as string);
        }
      }
      return {
        aws_access_key: formBody.accessKey,
        aws_secret_key: formBody.secretKey,
        aws_region: formBody.region,
        aws_account_id: accounts,
      };
    }
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
          custom_fields: getArrayTypeValuesFromFormData(formData, 'reportingFields'),
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
        custom_fields: getArrayTypeValuesFromFormData(formData, 'reportingFields'),
      };
    }
    case IntegrationType.s3: {
      const s3Object: {
        s3_bucket_name: FormDataEntryValue;
        aws_access_key: FormDataEntryValue;
        aws_secret_key: FormDataEntryValue;
        s3_folder_name: FormDataEntryValue;
        aws_region: FormDataEntryValue;
        use_iam_role: 'true' | 'false';
        aws_account_id?: FormDataEntryValue;
        target_account_role_arn?: FormDataEntryValue;
      } = {
        s3_bucket_name: formBody.name,
        aws_access_key: formBody.accessKey,
        aws_secret_key: formBody.secretKey,
        s3_folder_name: formBody.folder,
        aws_region: formBody.region,
        use_iam_role: formBody.useIAMRole === 'on' ? 'true' : 'false',
      };
      if (formBody.awsAccount && formBody.awsAccount.toString().trim()) {
        s3Object.aws_account_id = formBody.awsAccount;
      }
      if (formBody.awsARN && formBody.awsARN.toString().trim()) {
        s3Object.target_account_role_arn = formBody.awsARN;
      }
      return s3Object;
    }
    default:
      break;
  }
};
type ActionData = {
  message?: string;
  success?: boolean;
  deleteSuccess?: boolean;
  fieldErrors?: Record<string, string>;
} | null;

const action = async ({ request, params }: ActionFunctionArgs): Promise<ActionData> => {
  const _integrationType = params.integrationType?.toString();
  const formData = await request.formData();
  let _notificationType = formData.get('_notificationType')?.toString();
  const _actionType = formData.get('_actionType')?.toString();

  if (!_actionType) {
    return {
      message: 'Action Type is required1',
    };
  }

  if (_actionType === ActionEnumType.ADD) {
    if (_notificationType === 'CloudTrail Alert') {
      _notificationType = 'CloudTrailAlert';
    } else if (_notificationType === 'User Activities') {
      _notificationType = 'UserActivities';
    }

    // filters
    // statuses filter
    const selectedStatusesLength = Number(formData.get('selectedStatusesLength'));
    const statusFilter = [];
    if (selectedStatusesLength > 0) {
      for (let i = 0; i < selectedStatusesLength; i++) {
        statusFilter.push(formData.get(`statusFilter[${i}]`) as string);
      }
    }
    // severities filter
    const selectedSeveritiesLength = Number(formData.get('selectedSeveritiesLength'));
    const severityFilter = [];
    if (selectedSeveritiesLength > 0) {
      for (let i = 0; i < selectedSeveritiesLength; i++) {
        severityFilter.push(formData.get(`severityFilter[${i}]`) as string);
      }
    }
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
        [severityMap[_notificationType ?? ''] || 'severity']: severityFilter.map(
          (severity) => severity.toLowerCase(),
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
    const addIntegrationApi = apiWrapper({
      fn: getIntegrationApiClient().addIntegration,
    });
    const r = await addIntegrationApi({
      modelIntegrationAddReq: {
        integration_type: _integrationType,
        notification_type: _notificationType,
        config: getConfigBodyNotificationType(formData, _integrationType as string),
        filters: _filters,
      },
    });
    if (!r.ok) {
      if (r.error.response.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.error.response.json();
        return {
          message: modelResponse.message ?? '',
          fieldErrors: modelResponse.error_fields ?? {},
        };
      } else if (r.error.response.status === 403) {
        const message = await get403Message(r.error);
        return {
          message,
        };
      }
      throw r.error;
    }
    invalidateAllQueries();
    return {
      success: true,
    };
  } else if (_actionType === ActionEnumType.DELETE) {
    const id = formData.get('id')?.toString();
    if (!id) {
      return {
        deleteSuccess: false,
        message: 'An id is required to delete an integration',
      };
    }
    const deleteIntegrationApi = apiWrapper({
      fn: getIntegrationApiClient().deleteIntegration,
    });
    const r = await deleteIntegrationApi({
      integrationId: id,
    });
    if (!r.ok) {
      if (r.error.response.status === 400) {
        return {
          message: r.error.message ?? 'Error in deleting integrations',
        };
      } else if (r.error.response.status === 403) {
        const message = await get403Message(r.error);
        return {
          message,
          success: false,
        };
      }
    }
    invalidateAllQueries();
    return {
      deleteSuccess: true,
    };
  }

  return null;
};

const useEmailConfiguration = () => {
  return useSuspenseQuery({
    ...queries.setting.getEmailConfiguration(),
  });
};

const DeleteConfirmationModal = ({
  showDialog,
  row,
  setShowDialog,
}: {
  showDialog: boolean;
  row: ModelIntegrationListResp | undefined;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionData>();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('_actionType', actionType);
      formData.append('id', row?.id?.toString() ?? '');

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
      onOpenChange={() => setShowDialog(false)}
      title={
        !fetcher.data?.deleteSuccess ? (
          <div className="flex gap-3 items-center dark:text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Delete integration
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
          <span>The selected integration will be deleted.</span>
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

const Header = ({ title }: { title: string }) => {
  return (
    <SlidingModalHeader>
      <div className="text-h3 dark:text-text-text-and-icon py-4 px-4 dark:bg-bg-breadcrumb-bar">
        Add Integration: &nbsp;{title}
      </div>
    </SlidingModalHeader>
  );
};

const CheckMailConfiguration = () => {
  const { data } = useEmailConfiguration();

  return (
    <>
      {data?.data && data?.data?.length === 0 && (
        <span className="dark:text-status-error text-p7 flex items-center">
          Not configured to send emails. Please configure it in Settings-&gt;Email
          Configuration
        </span>
      )}
    </>
  );
};
const IntegrationAdd = () => {
  const { integrationType } = useParams() as {
    integrationType: string;
  };
  const [modelRow, setModelRow] = useState<ModelIntegrationListResp>();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const params = useParams() as {
    integrationType: string;
  };

  const onTableAction = useCallback(
    (row: ModelIntegrationListResp, actionType: string) => {
      if (actionType === ActionEnumType.DELETE) {
        setModelRow(row);
        setShowDeleteDialog(true);
      }
    },
    [],
  );

  const isEmailIntegration = useMemo(() => {
    return integrationType === 'email';
  }, [integrationType]);

  if (!integrationType) {
    throw new Error('Integration Type is required');
  }

  return (
    <div className="m-4">
      <div className="flex gapx-8">
        <Button
          variant="flat"
          startIcon={<PlusIcon />}
          onClick={() => {
            setOpenModal(true);
          }}
          size="sm"
        >
          Add new integration
        </Button>
        {isEmailIntegration && (
          <Suspense>
            <CheckMailConfiguration />
          </Suspense>
        )}
      </div>
      <SlidingModal
        open={openModal}
        onOpenChange={() => {
          setOpenModal(false);
        }}
        size="l"
      >
        <SlidingModalCloseButton />
        <Header title={integrationTypeToNameMapping[params.integrationType]} />
        <IntegrationForm integrationType={integrationType} setOpenModal={setOpenModal} />
      </SlidingModal>
      <div className="self-start mt-2">
        <Suspense fallback={<TableSkeleton columns={4} rows={5} />}>
          <IntegrationTable onTableAction={onTableAction} />
        </Suspense>
      </div>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          row={modelRow}
          setShowDialog={setShowDeleteDialog}
        />
      )}
    </div>
  );
};

export const module = {
  element: <IntegrationAdd />,
  action,
};
