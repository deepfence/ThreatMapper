import { ActionFunctionArgs, useFetcher } from 'react-router-dom';

import { getSettingsApiClient } from '@/api/api';
import { DF_COMMUNICATION_MESSAGE_QUERY_KEY } from '@/components/DfCommunication';
import { queryClient } from '@/queries/client';
import { apiWrapper } from '@/utils/api';

export const action = async ({ request }: ActionFunctionArgs): Promise<null> => {
  const formData = await request.formData();
  const messageId = formData.get('messageId')?.toString() ?? '';

  if (!messageId?.length) {
    console.error('Message ID is required');
    return null;
  }

  const markMessageReadResponse = apiWrapper({
    fn: getSettingsApiClient().markDeepfenceCommunicationRead,
  });

  const response = await markMessageReadResponse({
    id: Number(messageId),
  });

  if (!response.ok) {
    console.error('Failed to mark message as read');
    console.error(response.error);
    return null;
  }

  // fetch the messages again
  const getDeepfenceCommunicationMessages = apiWrapper({
    fn: getSettingsApiClient().getDeepfenceCommunicationMessages,
  });

  const messagesResponse = await getDeepfenceCommunicationMessages();

  if (!messagesResponse.ok) {
    console.error('Failed to fetch messages');
    console.error(messagesResponse.error);
    return null;
  }

  const unreadMessages = (messagesResponse.value ?? []).filter(
    (message) => !message.read,
  );

  queryClient.setQueryData(DF_COMMUNICATION_MESSAGE_QUERY_KEY, unreadMessages);

  return null;
};

export const useMarkDfMessageRead = () => {
  const fetcher = useFetcher<null>();

  return {
    markDfMessageRead: ({ messageId }: { messageId: number }) => {
      const formData = new FormData();
      formData.append('messageId', String(messageId));
      fetcher.submit(formData, {
        action: '/data-component/mark-df-message-read',
        method: 'post',
      });
    },
    isMarking: fetcher.state === 'submitting',
  };
};
