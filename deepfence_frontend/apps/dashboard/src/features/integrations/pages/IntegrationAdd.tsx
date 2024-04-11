import { useSuspenseQuery } from '@suspensive/react-query';
import { isNil } from 'lodash-es';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { ActionFunctionArgs, useFetcher, useParams } from 'react-router-dom';
import {
  Button,
  Modal,
  RowSelectionState,
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
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { getArrayTypeValuesFromFormData } from '@/utils/formData';

import { IntegrationForm, IntegrationType } from '../components/IntegrationForm';
import { IntegrationTable } from '../components/IntegrationTable';

export const CLOUD_TRAIL_ALERT = 'CloudTrail Alert';
export const USER_ACTIVITIES = 'User Activities';

export enum ActionEnumType {
  DELETE = 'delete',
  ADD = 'add',
  EDIT = 'edit',
  CONFIRM_DELETE = 'confirm_delete',
}
export const severityMap: {
  [key: string]: string;
} = {
  Vulnerability: 'cve_severity',
  Secret: 'level',
  Malware: 'file_severity',
  Compliance: 'status',
  CloudCompliance: 'status',
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
      const accounts = getArrayTypeValuesFromFormData(formData, 'cloudAccountsFilter');
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
  action: ActionEnumType;
  message?: string;
  success?: boolean;
  deleteSuccess?: boolean;
  fieldErrors?: Record<string, string>;
} | null;

const action = async ({ request, params }: ActionFunctionArgs): Promise<ActionData> => {
  const _integrationType = params.integrationType?.toString() ?? '';
  const formData = await request.formData();
  const _notificationType = formData.get('_notificationType')?.toString() ?? '';
  const _actionType = formData.get('_actionType')?.toString();
  const integrationId = formData.get('integrationId')?.toString() ?? '';

  if (!_actionType) {
    return {
      message: 'Action Type is required',
      action: _actionType as ActionEnumType,
    };
  }
  if (_actionType === ActionEnumType.ADD || _actionType === ActionEnumType.EDIT) {
    const intervalFilter = formData.get('interval')?.toString();
    // filters
    const statusFilter = getArrayTypeValuesFromFormData(formData, 'statusFilter');
    const severityFilter = getArrayTypeValuesFromFormData(formData, 'severityFilter');
    const hostFilter = getArrayTypeValuesFromFormData(formData, 'hostFilter');
    const containerFilter = getArrayTypeValuesFromFormData(formData, 'containerFilter');
    const imageFilter = getArrayTypeValuesFromFormData(formData, 'imageFilter');
    const clusterFilter = getArrayTypeValuesFromFormData(formData, 'clusterFilter');

    const _filters: {
      node_ids: ModelNodeIdentifier[];
      fields_filters: ReportersFieldsFilters;
      container_names: string[];
    } = {
      fields_filters: {
        compare_filter: null,
        contains_filter: { filter_in: {} },
        match_filter: { filter_in: null },
        order_filter: {
          order_fields: null,
        },
      },
      container_names: [],
      node_ids: [],
    };

    const accountIds = getArrayTypeValuesFromFormData(formData, 'cloudAccountsFilter');

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
      _filters.container_names = containerFilter;
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
    if (accountIds.length) {
      const _accounts: ModelNodeIdentifier[] = accountIds.map<ModelNodeIdentifier>(
        (id) => {
          return {
            node_id: id,
            node_type: ModelNodeIdentifierNodeTypeEnum.CloudAccount,
          };
        },
      );
      nodeIds.push(..._accounts);
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
    const updateIntegrationApi = apiWrapper({
      fn: getIntegrationApiClient().updateIntegration,
    });
    let result = null;
    if (_actionType === ActionEnumType.EDIT) {
      if (!integrationId) {
        return {
          message: 'Integration id is required for edit',
          action: _actionType as ActionEnumType,
        };
      }
      result = await updateIntegrationApi({
        integrationId,
        modelIntegrationUpdateReq: {
          integration_type: _integrationType,
          notification_type: _notificationType,
          config: getConfigBodyNotificationType(formData, _integrationType as string),
          filters: _filters,
        },
      });
    } else {
      result = await addIntegrationApi({
        modelIntegrationAddReq: {
          integration_type: _integrationType,
          notification_type: _notificationType,
          config: getConfigBodyNotificationType(formData, _integrationType as string),
          filters: _filters,
        },
      });
    }

    if (!result.ok) {
      if (result.error.response.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse =
          await result.error.response.json();
        return {
          action: _actionType as ActionEnumType,
          message: modelResponse.message ?? '',
          fieldErrors: modelResponse.error_fields ?? {},
        };
      } else if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        return {
          action: _actionType as ActionEnumType,
          message,
        };
      }
      throw result.error;
    }
    invalidateAllQueries();
    return {
      action: _actionType as ActionEnumType,
      success: true,
    };
  } else if (_actionType === ActionEnumType.DELETE) {
    const ids = formData.getAll('id[]') as string[];
    if (ids.length === 0) {
      return {
        action: _actionType as ActionEnumType,
        deleteSuccess: false,
        message: 'No integration id to delete',
      };
    }
    const deleteIntegrationApi = apiWrapper({
      fn: getIntegrationApiClient().bulkDeleteIntegration,
    });
    const r = await deleteIntegrationApi({
      modelDeleteIntegrationReq: {
        integration_ids: ids?.map((id) => Number(id)),
      },
    });
    if (!r.ok) {
      if (r.error.response.status === 400) {
        const { message } = await getResponseErrors(r.error);
        return {
          action: _actionType as ActionEnumType,
          success: false,
          message: message ?? 'Error in deleting integrations',
        };
      } else if (r.error.response.status === 403) {
        const message = await get403Message(r.error);
        return {
          action: _actionType as ActionEnumType,
          message,
          success: false,
        };
      }
    }
    invalidateAllQueries();
    return {
      action: _actionType as ActionEnumType,
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
  ids,
  setShowDialog,
  onDeleteSuccess,
}: {
  showDialog: boolean;
  ids: string[];
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onDeleteSuccess: () => void;
}) => {
  const fetcher = useFetcher<ActionData>();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('_actionType', actionType);
      ids.forEach((item) => formData.append('id[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [fetcher, ids],
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
      onOpenChange={() => setShowDialog(false)}
      title={
        !fetcher.data?.deleteSuccess ? (
          <div className="flex gap-3 items-center text-status-error">
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
            <p className="mt-2 text-status-error text-p7">{fetcher.data?.message}</p>
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
      <div className="text-h3 dark:text-text-text-and-icon py-4 px-4 dark:bg-bg-header bg-bg-breadcrumb-bar">
        {title}
      </div>
    </SlidingModalHeader>
  );
};

const CheckMailConfiguration = () => {
  const { data } = useEmailConfiguration();

  return (
    <>
      {data?.data && data?.data?.length === 0 && (
        <span className="text-status-error text-p7 flex items-center">
          Not configured to send emails. Please configure it in Settings-&gt;Email
          Configuration
        </span>
      )}
    </>
  );
};

const BulkActions = ({
  selectedRows,
  setRowSelectionState,
}: {
  selectedRows: RowSelectionState;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const integrationIdsToDelete = useMemo(() => {
    return Object.keys(selectedRows).map((id) => {
      return id;
    });
  }, [selectedRows]);

  return (
    <>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          ids={integrationIdsToDelete}
          setShowDialog={setShowDeleteDialog}
          onDeleteSuccess={() => {
            setRowSelectionState({});
          }}
        />
      )}
      <Button
        color="error"
        variant="flat"
        size="sm"
        disabled={integrationIdsToDelete.length === 0}
        onClick={() => {
          setShowDeleteDialog(true);
        }}
      >
        Delete Integration
      </Button>
    </>
  );
};

const IntegrationAdd = () => {
  const { integrationType } = useParams() as {
    integrationType: string;
  };
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [integrationToEdit, setIntegrationToEdit] =
    useState<ModelIntegrationListResp | null>(null);

  const [showAddIntegrationModal, setShowAddIntegrationModal] = useState<boolean>(false);
  const [showEditIntegrationModal, setShowEditIntegrationModal] =
    useState<boolean>(false);

  const [integrationIdsToDelete, setIntegrationIdsToDelete] = useState<string[]>([]);

  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});

  const params = useParams() as {
    integrationType: string;
  };

  const onTableAction = useCallback(
    (row: ModelIntegrationListResp, actionType: string) => {
      if (actionType === ActionEnumType.DELETE) {
        if (!row.id) {
          console.error('Row is missing integration id');
          return;
        }
        setIntegrationIdsToDelete([row.id.toString()]);
        setShowDeleteDialog(true);
      } else if (actionType === ActionEnumType.EDIT) {
        setIntegrationToEdit(row);
        setShowEditIntegrationModal(true);
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
      <div className="flex gap-x-2">
        <Button
          variant="flat"
          startIcon={<PlusIcon />}
          onClick={() => {
            setShowAddIntegrationModal(true);
          }}
          size="sm"
        >
          Add new integration
        </Button>
        <BulkActions
          selectedRows={rowSelectionState}
          setRowSelectionState={setRowSelectionState}
        />
        {isEmailIntegration && (
          <Suspense>
            <CheckMailConfiguration />
          </Suspense>
        )}
      </div>
      {!isNil(integrationToEdit) ? (
        <SlidingModal
          open={showEditIntegrationModal}
          onOpenChange={() => {
            setShowEditIntegrationModal(false);
          }}
          size="l"
        >
          <SlidingModalCloseButton />
          <Header
            title={`Edit Integration: ${
              integrationTypeToNameMapping[params.integrationType]
            }`}
          />
          <IntegrationForm
            integrationType={integrationType}
            setOpenModal={setShowEditIntegrationModal}
            data={integrationToEdit}
          />
        </SlidingModal>
      ) : null}
      {showAddIntegrationModal ? (
        <SlidingModal
          open={showAddIntegrationModal}
          onOpenChange={() => {
            setShowAddIntegrationModal(false);
          }}
          size="l"
        >
          <SlidingModalCloseButton />
          <Header
            title={`Add Integration: ${
              integrationTypeToNameMapping[params.integrationType]
            }`}
          />
          <IntegrationForm
            integrationType={integrationType}
            setOpenModal={setShowAddIntegrationModal}
          />
        </SlidingModal>
      ) : null}

      <div className="self-start mt-2">
        <Suspense fallback={<TableSkeleton columns={4} rows={5} />}>
          <IntegrationTable
            onTableAction={onTableAction}
            rowSelectionState={rowSelectionState}
            setRowSelectionState={setRowSelectionState}
          />
        </Suspense>
      </div>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          ids={integrationIdsToDelete}
          setShowDialog={setShowDeleteDialog}
          onDeleteSuccess={() => {
            setRowSelectionState({});
          }}
        />
      )}
    </div>
  );
};

export const module = {
  element: <IntegrationAdd />,
  action,
};
