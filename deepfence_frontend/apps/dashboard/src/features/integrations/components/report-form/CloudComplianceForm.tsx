import { useEffect, useState } from 'react';
import { Listbox, ListboxOption } from 'ui-components';

import { getReportBenchmarkList } from '@/features/integrations/pages/DownloadReport';

export const CloudComplianceForm = ({
  setProvider,
  provider,
}: {
  setProvider: React.Dispatch<React.SetStateAction<string>>;
  provider: string;
}) => {
  const [benchmarkType, setBenchmarkType] = useState<string[]>([]);

  useEffect(() => {
    setBenchmarkType([]);
  }, [provider]);

  return (
    <>
      <Listbox
        variant="underline"
        label="Select Provider"
        value={provider}
        name="nodeType"
        onChange={(value) => {
          setProvider(value);
        }}
        getDisplayValue={() => {
          return (
            ['Aws', 'Gcp', 'Azure'].find((_provider) => {
              return _provider === provider;
            }) ?? ''
          );
        }}
        placeholder="Select Provider"
      >
        {['Aws', 'Gcp', 'Azure'].map((resource) => {
          return (
            <ListboxOption value={resource} key={resource}>
              {resource}
            </ListboxOption>
          );
        })}
      </Listbox>

      {provider && (
        <>
          <input
            type="text"
            name="selectedSeveritiesOrCheckTypeLength"
            hidden
            readOnly
            value={benchmarkType.length}
          />
          <Listbox
            variant="underline"
            value={benchmarkType}
            name="severityOrCheckType"
            onChange={(value) => {
              setBenchmarkType(value);
            }}
            placeholder="Select check type"
            label="Select Check Type"
            getDisplayValue={(value) => {
              return value && value.length > 0 ? `${value.length} selected` : 'Severity';
            }}
            multiple
            clearAll="Clear"
            onClearAll={() => {
              setBenchmarkType([]);
            }}
          >
            {getReportBenchmarkList(provider)?.map((provider) => {
              return (
                <ListboxOption value={provider} key={provider}>
                  {provider}
                </ListboxOption>
              );
            })}
          </Listbox>
        </>
      )}
    </>
  );
};
