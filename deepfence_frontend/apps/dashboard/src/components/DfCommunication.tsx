import { useQuery } from '@tanstack/react-query';
import { Button, Modal } from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import { PostgresqlDbDeepfenceCommunication } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { InfoStandardIcon } from '@/components/icons/common/InfoStandard';
import { PopOutIcon } from '@/components/icons/common/PopOut';
import { useMarkDfMessageRead } from '@/features/common/data-component/markDfMessageReadAction';
import { queryClient } from '@/queries/client';
import { apiWrapper } from '@/utils/api';
import { isThreatMapper } from '@/utils/version';

export const DF_COMMUNICATION_MESSAGE_QUERY_KEY = ['getNotifications'];

export async function handleThreatMapperCommunicationMessages() {
  if (isThreatMapper) {
    const communicationMessages = apiWrapper({
      fn: getSettingsApiClient().getDeepfenceCommunicationMessages,
    });
    const result = await communicationMessages();
    if (!result.ok) {
      console.error('Failed to get communication messages');
      console.error(result.error);
      return;
    }
    const messages = result.value ?? [];
    if (!messages.length) {
      return;
    }
    const unreadMessages = messages.filter((message) => !message.read);
    if (!unreadMessages.length) {
      return;
    }
    // set data in the tanstack query store
    queryClient.setQueryData(DF_COMMUNICATION_MESSAGE_QUERY_KEY, unreadMessages);
  }
}

export function DfCommunication() {
  if (!isThreatMapper) {
    return null;
  }
  const { markDfMessageRead, isMarking } = useMarkDfMessageRead();

  const { data } = useQuery({
    queryKey: DF_COMMUNICATION_MESSAGE_QUERY_KEY,
    queryFn: async (): Promise<PostgresqlDbDeepfenceCommunication[]> => {
      // noop
      return [];
    },
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  const message = data?.[0] ?? null;
  if (!message) {
    return null;
  }

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) {
          markDfMessageRead({ messageId: message.id! });
        }
      }}
      size="s"
      showCloseButton={false}
      title={
        <div className="flex gap-3 items-center">
          <span className="h-6 w-6 shrink-0">
            <InfoStandardIcon />
          </span>
          {message.title ? message.title : 'Important Message'}
        </div>
      }
      footer={
        <div className={'flex gap-x-4 justify-end'}>
          <Button
            size="md"
            color="default"
            onClick={(e) => {
              e.preventDefault();
              markDfMessageRead({ messageId: message.id! });
            }}
            loading={isMarking}
            disabled={isMarking}
          >
            {message.button_content ? message.button_content : 'Ok'}
          </Button>
        </div>
      }
    >
      <div className="grid">
        {message.content?.length ? <span>{message.content}</span> : null}
        {message.link?.length ? (
          <div className="flex items-center gap-x-1">
            <div className="shrink-0 h-4 w-4 text-text-text-and-icon">
              <PopOutIcon />
            </div>
            <DFLink href={message.link} target="_blank">
              {message.link_title?.length ? message.link_title : message.link}
            </DFLink>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
