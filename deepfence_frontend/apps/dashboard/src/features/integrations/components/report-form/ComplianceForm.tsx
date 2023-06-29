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
  const [benchmarkType, setBenchmarkType] = useState('');
  useEffect(() => {
    setBenchmarkType('');
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
        placeholder="Select Node Type"
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
        <Listbox
          variant="underline"
          value={benchmarkType}
          name="severity[]"
          onChange={(value) => {
            setBenchmarkType(value);
          }}
          placeholder="Select check type"
          label="Select Check Type"
        >
          {getReportBenchmarkList(provider)?.map((provider) => {
            return (
              <ListboxOption value={provider} key={provider}>
                {provider}
              </ListboxOption>
            );
          })}
        </Listbox>
      )}
    </>
  );
};
