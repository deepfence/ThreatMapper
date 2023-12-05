import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { Button, CircleSpinner, Listbox, ListboxOption, Modal } from 'ui-components';

import { getControlsApiClient } from '@/api/api';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';

interface ActionData {
  success: boolean;
  message?: string;
}
export const action = async ({
  request,
}: ActionFunctionArgs): Promise<{
  message?: string;
  success: boolean;
}> => {
  const formData = await request.formData();
  const nodeIds = formData.getAll('nodeIds[]') as string[];
  const version = formData.get('version') as string;

  const upgradeApi = apiWrapper({
    fn: getControlsApiClient().upgradeAgentVersion,
  });
  const response = await upgradeApi({
    modelAgentUpgrade: {
      node_ids: nodeIds,
      version,
    },
  });
  if (!response.ok) {
    if (response.error.response.status === 400) {
      const { message } = await getResponseErrors(response.error);
      return {
        message,
        success: false,
      };
    }
    if (response.error.response.status === 403) {
      const message = await get403Message(response.error);
      return {
        message,
        success: false,
      };
    }
    throw response.error;
  }
  invalidateAllQueries();
  return {
    success: true,
    message: '',
  };
};

const useGetAgentVersions = () => {
  return useSuspenseQuery({
    ...queries.setting.listAgentVersion(),
  });
};

const AgentVersion = ({
  setVersion,
}: {
  setVersion: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const { data } = useGetAgentVersions();
  const [selectedVersion, setSelectedVersion] = useState<string | null>(() => {
    return null;
  });

  if (data.message && data.message.length) {
    return <p className="dark:text-status-error text-p7">{data.message}</p>;
  }

  return (
    <Listbox
      name="version"
      variant="underline"
      label="Select agent version to upgrade"
      placeholder="Select version"
      value={selectedVersion}
      onChange={(value: string) => {
        setSelectedVersion(value);
        setVersion?.(value);
      }}
      getDisplayValue={(value) => {
        return value ?? '';
      }}
    >
      {data.versions?.map((version) => {
        return (
          <ListboxOption
            key={version}
            value={version}
            onClick={() => {
              setVersion(version);
            }}
          >
            {version}
          </ListboxOption>
        );
      })}
    </Listbox>
  );
};
export const UpgrageAgentModal = ({
  nodes,
  setShowDialog,
}: {
  nodes: {
    nodeId: string;
  }[];
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionData>();
  const [version, setVersion] = useState('');

  const onAction = () => {
    const formData = new FormData();
    nodes.forEach((node) => formData.append('nodeIds[]', node.nodeId));
    formData.append('version', version);
    fetcher.submit(formData, {
      method: 'post',
      action: '/data-component/controls/agent-upgrade',
    });
  };

  return (
    <Modal
      size="s"
      open={true}
      onOpenChange={() => setShowDialog(false)}
      title={!fetcher.data?.success ? `Upgrade Agent` : ''}
      footer={
        !fetcher.data?.success ? (
          <div className={'flex gap-x-4 mt-4 justify-end'}>
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
                onAction();
              }}
            >
              Submit
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <div className="flex gap-x-1 flex-col">
          <Suspense
            fallback={
              <Listbox
                label="Select agent version to upgrade"
                variant="underline"
                startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
                placeholder="Scan version"
              />
            }
          >
            <AgentVersion setVersion={setVersion} />
          </Suspense>
          {fetcher.data?.message && (
            <p className="mt-2 text-p7 dark:text-status-error">{fetcher.data?.message}</p>
          )}
        </div>
      ) : (
        <SuccessModalContent text="Upgraded successfully" />
      )}
    </Modal>
  );
};
