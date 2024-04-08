import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

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
            <Combobox
              triggerVariant="select"
              placeholder="Select fields"
              label={'Select Fields to be sent in report (Default: All)'}
              onQueryChange={() => {
                /**noop */
              }}
              startIcon={<CircleSpinner size="sm" />}
            />
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
    <Combobox
      name="reportingFields"
      triggerVariant="select"
      placeholder="Select fields"
      label={'Select Fields to be sent in report (Default: All)'}
      multiple
      value={selectedFields}
      onChange={(value) => setSelectedFields(value)}
      onQueryChange={(query) => {
        setSearchQuery(query);
      }}
      getDisplayValue={(items) => {
        if (!items.length) return null;
        return `${items.length} fields selected`;
      }}
    >
      {data[notificationType as 'vulnerability']
        ?.filter((field) => {
          return field.toLowerCase().includes(searchQuery);
        })
        .map((field) => {
          return (
            <ComboboxOption key={field} value={field}>
              {field}
            </ComboboxOption>
          );
        })}
    </Combobox>
  );
};
