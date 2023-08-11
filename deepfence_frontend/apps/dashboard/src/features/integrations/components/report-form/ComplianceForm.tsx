import { useEffect, useState } from 'react';
import { Listbox, ListboxOption } from 'ui-components';

import {
  getReportBenchmarkList,
  getReportNodeType,
} from '@/features/integrations/pages/DownloadReport';

export const ComplianceForm = ({
  setProvider,
  resource,
  provider,
}: {
  setProvider: React.Dispatch<React.SetStateAction<string>>;
  resource: string;
  provider: string;
}) => {
  const [benchmarkType, setBenchmarkType] = useState<string[]>([]);

  useEffect(() => {
    setBenchmarkType([]);
  }, [resource, provider]);

  return (
    <>
      <Listbox
        variant="underline"
        label="Select Node Type"
        value={provider}
        name="nodeType"
        onChange={(value) => {
          setProvider(value);
        }}
        placeholder="Select node type"
        getDisplayValue={() => {
          return provider;
        }}
      >
        {Object.keys(getReportNodeType(resource)).map((resource) => {
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
