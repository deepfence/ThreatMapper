import { useSuspenseQuery } from '@suspensive/react-query';
import { flatten, groupBy } from 'lodash-es';
import { Suspense, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import {
  getIntegrationPrettyName,
  IntegrationKeyType,
} from '@/features/integrations/components/integration-form/utils';
import { queries } from '@/queries';

function useListIntegrations() {
  return useSuspenseQuery({
    ...queries.integration.listIntegrations(),
  });
}

const Channel = () => {
  const [selectedChannel, setSelectedChannel] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  const {
    data: { data, message },
  } = useListIntegrations();

  if (message && message.length) {
    return <p className="text-p7 dark:text-status-error">{message}</p>;
  }
  const groupData = groupBy(data, 'integration_type');

  const integrationIds = useMemo(() => {
    return selectedChannel.map((integrationType) => {
      return groupData[integrationType].map((integration) => {
        return integration.id;
      });
    });
  }, [selectedChannel]);

  const flattenIds = flatten(integrationIds);

  return (
    <>
      {flattenIds?.length
        ? flattenIds.map((id) => {
            return (
              <input
                readOnly
                type="hidden"
                key={id}
                name="integrationIds[]"
                value={id ?? ''}
              />
            );
          })
        : null}
      <Combobox
        label="Select notification channel"
        name="channelNames"
        triggerVariant="select"
        getDisplayValue={() =>
          selectedChannel.length ? `${selectedChannel.length} selected` : 'Select channel'
        }
        multiple
        value={selectedChannel}
        onChange={(values) => {
          setSelectedChannel(values);
        }}
        onQueryChange={(query) => {
          setQuery(query);
        }}
        clearAllElement="Clear"
        onClearAll={() => {
          setSelectedChannel([]);
        }}
      >
        {Object.keys(groupData)
          .filter((item) => {
            if (!query.length) return true;
            if (item.toLowerCase().includes(query.toLowerCase())) return true;
            return false;
          })
          .map((item) => {
            /** TODO: remove typecast to IntegrationKeyType when notification_type?: string; is fixed in backend */
            return (
              <ComboboxOption key={item} value={item}>
                {getIntegrationPrettyName(item as IntegrationKeyType)}
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};

export const SelectNotificationChannel = () => {
  return (
    <Suspense
      fallback={
        <Combobox
          label={'Select notification channel'}
          triggerVariant={'select'}
          startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
          placeholder="Channel name"
          multiple
          onQueryChange={() => {
            // no operation
          }}
        />
      }
    >
      <Channel />
    </Suspense>
  );
};
