import { useSuspenseQuery } from '@suspensive/react-query';
import { isNil } from 'lodash-es';
import { Suspense, useCallback, useMemo, useState } from 'react';
import {
  ActionFunctionArgs,
  Outlet,
  useFetcher,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbLink,
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  Modal,
  Table,
  TableNoDataElement,
  TableSkeleton,
} from 'ui-components';

import { getGenerativeAIIntegraitonClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelGenerativeAiIntegrationListResponse,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { PlusIcon } from '@/components/icons/common/Plus';
import { IntegrationsIcon } from '@/components/sideNavigation/icons/Integrations';
import { TruncatedText } from '@/components/TruncatedText';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { GenerativeAIIntegrationType } from '@/types/common';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';

export const AI_INTEGRATION_TYPES: Record<GenerativeAIIntegrationType, string> = {
  openai: 'OpenAI',
  'amazon-bedrock': 'Amazon Bedrock',
};

export enum ActionEnumType {
  DELETE = 'delete',
  MAKE_DEFAULT = 'make_default',
}

export const useListIntegrations = () => {
  return useSuspenseQuery({
    ...queries.integration.listIntegrations(),
  });
};

interface ActionData {
  success: boolean;
  message?: string;
}

const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();

  const actionType = formData.get('_actionType')?.toString();

  if (actionType === ActionEnumType.DELETE) {
    const id = formData.get('id')?.toString() ?? '';

    const deleteAIIntegration = apiWrapper({
      fn: getGenerativeAIIntegraitonClient().deleteGenerativeAiIntegration,
    });

    const response = await deleteAIIntegration({
      integrationId: id,
    });

    if (!response.ok) {
      if (response.error.response.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse =
          await response.error.response.json();

        return {
          success: false,
          message: modelResponse.message ?? '',
        };
      } else if (response.error.response.status === 403) {
        const message = await get403Message(response.error);
        return {
          success: false,
          message,
        };
      }
      throw response.error;
    }

    invalidateAllQueries();
    return {
      success: true,
    };
  } else if (actionType === ActionEnumType.MAKE_DEFAULT) {
    const id = formData.get('id')?.toString() ?? '';

    const setDefaultAIIntegration = apiWrapper({
      fn: getGenerativeAIIntegraitonClient().setDefaultGenerativeAiIntegration,
    });

    const response = await setDefaultAIIntegration({
      integrationId: id,
    });

    if (!response.ok) {
      if (response.error.response.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse =
          await response.error.response.json();

        return {
          success: false,
          message: modelResponse.message ?? '',
        };
      } else if (response.error.response.status === 403) {
        const message = await get403Message(response.error);
        return {
          success: false,
          message,
        };
      }
      throw response.error;
    }

    invalidateAllQueries();
    return {
      success: true,
    };
  }
  throw new Error('invalid action type');
};

const DeleteConfirmationModal = ({
  showDialog,
  id,
  setShowDialog,
}: {
  showDialog: boolean;
  id: number;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionData>();

  const onDeleteAction = useCallback(() => {
    const formData = new FormData();
    formData.append('_actionType', ActionEnumType.DELETE);
    formData.append('id', String(id));

    fetcher.submit(formData, {
      method: 'POST',
    });
  }, [fetcher, id]);
  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Delete integration
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
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
                onDeleteAction();
              }}
            >
              Delete
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
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

const MakeDefaultConfirmationModal = ({
  showDialog,
  id,
  setShowDialog,
}: {
  showDialog: boolean;
  id: number;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionData>();

  const onDeleteAction = useCallback(() => {
    const formData = new FormData();
    formData.append('_actionType', ActionEnumType.MAKE_DEFAULT);
    formData.append('id', String(id));

    fetcher.submit(formData, {
      method: 'POST',
    });
  }, [fetcher, id]);
  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Mark this integration as default
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
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
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
              onClick={(e) => {
                e.preventDefault();
                onDeleteAction();
              }}
            >
              Make Default
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <div className="grid">
          <span>
            The selected integration will be marked as default for generating
            remediations.
          </span>
          <br />
          <span>Are you sure?</span>
          {fetcher.data?.message ? (
            <p className="mt-2 text-status-error text-p7">{fetcher.data?.message}</p>
          ) : null}
        </div>
      ) : (
        <SuccessModalContent text="Marked successfully!" />
      )}
    </Modal>
  );
};

const AIIntegrationList = () => {
  const navigate = useNavigate();

  const params = useParams() as {
    integrationType?: GenerativeAIIntegrationType;
  };
  const breadcrumbs = [
    <BreadcrumbLink key="1" asChild icon={<IntegrationsIcon />} isLink>
      <DFLink to={'/integrations'} unstyled>
        Integrations
      </DFLink>
    </BreadcrumbLink>,
    <BreadcrumbLink key="2">
      <span className="inherit cursor-auto">Generative AI</span>
    </BreadcrumbLink>,
  ];

  if (params.integrationType?.length) {
    breadcrumbs.push(
      <BreadcrumbLink>
        <span className="inherit cursor-auto">
          {AI_INTEGRATION_TYPES[params.integrationType] ?? params.integrationType}
        </span>
      </BreadcrumbLink>,
    );
  }
  return (
    <>
      <div className="px-4 py-2 w-full items-center bg-bg-breadcrumb-bar dark:border-none border-b border-bg-grid-border">
        <Breadcrumb>{breadcrumbs}</Breadcrumb>
      </div>
      <div className="m-4">
        <div className="flex gapx-8">
          <Button
            variant="flat"
            startIcon={<PlusIcon />}
            onClick={() => {
              navigate('./add');
            }}
            size="sm"
          >
            Add new integration
          </Button>
        </div>
        <div className="self-start mt-2">
          <Suspense fallback={<TableSkeleton columns={4} rows={5} />}>
            <AIIntegrationTable />
          </Suspense>
        </div>
      </div>
      <Outlet />
    </>
  );
};

function useListAIIntegrations() {
  return useSuspenseQuery({
    ...queries.integration.listAIIntegrations(),
  });
}

const ActionDropdown = ({
  row,
  trigger,
  onTableAction,
}: {
  row: ModelGenerativeAiIntegrationListResponse;
  trigger: React.ReactNode;
  onTableAction: (
    row: ModelGenerativeAiIntegrationListResponse,
    actionType: ActionEnumType,
  ) => void;
}) => {
  return (
    <Dropdown
      triggerAsChild={true}
      align={'start'}
      content={
        <>
          {!row.default_integration ? (
            <DropdownItem onClick={() => onTableAction(row, ActionEnumType.MAKE_DEFAULT)}>
              Make default
            </DropdownItem>
          ) : null}
          <DropdownItem
            onClick={() => onTableAction(row, ActionEnumType.DELETE)}
            color="error"
          >
            Delete
          </DropdownItem>
        </>
      }
    >
      {trigger}
    </Dropdown>
  );
};

const AIIntegrationTable = () => {
  const {
    data: { data, message },
  } = useListAIIntegrations();

  const params = useParams() as {
    integrationType?: string;
  };

  const filteredData = params.integrationType?.length
    ? data.filter(
        (integration) => integration.integration_type === params.integrationType,
      )
    : data;

  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const [idToMakeDefault, setIdToMakeDefault] = useState<number | null>(null);

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<ModelGenerativeAiIntegrationListResponse>();

    const columns = [
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          const id = cell.row.original.id;
          if (!id) {
            throw new Error('Integration id not found');
          }
          return (
            <ActionDropdown
              row={cell.row.original}
              onTableAction={(row, actionType) => {
                if (actionType === ActionEnumType.DELETE) {
                  setIdToDelete(row.id!);
                } else if (actionType === ActionEnumType.MAKE_DEFAULT) {
                  setIdToMakeDefault(row.id!);
                }
              }}
              trigger={
                <button className="p-1">
                  <div className="h-[16px] w-[16px] text-text-text-and-icon rotate-90">
                    <EllipsisIcon />
                  </div>
                </button>
              }
            />
          );
        },
        header: () => '',
        minSize: 30,
        size: 30,
        maxSize: 35,
        enableResizing: false,
      }),
      columnHelper.accessor('integration_type', {
        header: () => 'Type',
        size: 100,
        minSize: 50,
        maxSize: 150,
      }),
      columnHelper.accessor('label', {
        header: () => 'Label',
        size: 150,
        minSize: 100,
        maxSize: 300,
      }),
      columnHelper.accessor('default_integration', {
        header: () => 'Is default?',
        cell: (info) => {
          return info.getValue() ? 'Yes' : 'No';
        },
        size: 100,
        minSize: 50,
        maxSize: 150,
      }),
      columnHelper.accessor('last_error_msg', {
        header: () => 'Last error message',
        cell: (info) => {
          const error = info.getValue();

          if (!error?.length) return '-';
          return <TruncatedText text={error} />;
        },
        size: 150,
        minSize: 50,
        maxSize: 250,
      }),
    ];

    return columns;
  }, []);

  if (message && message.length) {
    return <p className="text-p7 text-status-error">{message}</p>;
  }

  return (
    <>
      <Table
        data={filteredData}
        columns={columns}
        enableColumnResizing
        noDataElement={
          <TableNoDataElement text="No integrations found, please add new integration" />
        }
      />
      {!isNil(idToDelete) ? (
        <DeleteConfirmationModal
          showDialog
          id={idToDelete}
          setShowDialog={(show) => {
            if (!show) setIdToDelete(null);
          }}
        />
      ) : null}
      {!isNil(idToMakeDefault) ? (
        <MakeDefaultConfirmationModal
          showDialog
          id={idToMakeDefault}
          setShowDialog={(show) => {
            if (!show) setIdToMakeDefault(null);
          }}
        />
      ) : null}
    </>
  );
};

export const module = {
  element: <AIIntegrationList />,
  action,
};
