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
  const [benchmarkType, setBenchmarkType] = useState('');
  useEffect(() => {
    setBenchmarkType('');
  }, [provider]);
  return (
    <div className="flex flex-col gap-y-4">
      <Listbox
        variant="outline"
        label="Select Provider"
        value={provider}
        name="nodeType"
        onChange={(value) => {
          setProvider(value);
        }}
        placeholder="Select Provider"
      >
        {['Aws', 'Google', 'Azure'].map((resource) => {
          return (
            <ListboxOption value={resource} key={resource}>
              {resource}
            </ListboxOption>
          );
        })}
      </Listbox>

      {provider && (
        <>
          <Listbox
            variant="outline"
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
        </>
      )}
    </div>
  );
};
