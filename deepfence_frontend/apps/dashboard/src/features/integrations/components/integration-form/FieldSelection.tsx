import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useState } from 'react';
import {
  CircleSpinner,
  ComboboxV2Content,
  ComboboxV2Item,
  ComboboxV2Provider,
  ComboboxV2TriggerInput,
} from 'ui-components';

import { queries } from '@/queries';

export const FieldSelection = ({
  notificationType,
  defaultSelectedFields,
}: {
  notificationType: 'vulnerability';
  defaultSelectedFields?: string[];
}) => {
  return (
    <div className="flex flex-col col-span-2">
      <div className="pt-4 flex text-text-input-value ">
        <div className="text-h5">Customize Notification (Optional)</div>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 pt-4">
        <Suspense
          fallback={
            <ComboboxV2Provider name="reportingFields" selectedValue={[]}>
              <ComboboxV2TriggerInput
                label={'Select Fields to be sent in report (Default: All)'}
                placeholder="Select fields"
                startIcon={<CircleSpinner size="sm" />}
              />
            </ComboboxV2Provider>
          }
        >
          <FieldSelectionDropdown
            notificationType={notificationType}
            defaultSelectedFields={defaultSelectedFields ?? []}
          />
        </Suspense>
      </div>
    </div>
  );
};

function useNotificationFields() {
  return useSuspenseQuery({
    ...queries.integration.getNotificationFields(),
  });
}

const FieldSelectionDropdown = ({
  notificationType,
  defaultSelectedFields,
}: {
  notificationType: 'vulnerability';
  defaultSelectedFields: string[];
}) => {
  const { data } = useNotificationFields();
  const [selectedFields, setSelectedFields] = useState<string[]>(defaultSelectedFields);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <ComboboxV2Provider
      selectedValue={selectedFields}
      setSelectedValue={(value) => setSelectedFields(value)}
      setValue={(query) => {
        setSearchQuery(query);
      }}
      name="reportingFields"
    >
      <ComboboxV2TriggerInput
        placeholder="Select fields"
        label={'Select Fields to be sent in report (Default: All)'}
        getDisplayValue={(items) => {
          if (!items.length) return null;
          return `${items.length} fields selected`;
        }}
      />
      <ComboboxV2Content width="anchor">
        {data[notificationType as 'vulnerability']
          ?.filter((field) => {
            return field.toLowerCase().includes(searchQuery);
          })
          .map((field) => {
            return (
              <ComboboxV2Item key={field} value={field}>
                {field}
              </ComboboxV2Item>
            );
          })}
      </ComboboxV2Content>
    </ComboboxV2Provider>
  );
};
