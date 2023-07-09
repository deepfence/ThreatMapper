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
          <Listbox
            variant="underline"
            value={benchmarkType}
            name="severity[]"
            onChange={(value) => {
              setBenchmarkType(value);
            }}
            placeholder="Select check type"
            label="Select Check Type"
            getDisplayValue={() => {
              return (
                getReportBenchmarkList(provider).find((_benchmarkType) => {
                  return _benchmarkType === benchmarkType;
                }) ?? ''
              );
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
