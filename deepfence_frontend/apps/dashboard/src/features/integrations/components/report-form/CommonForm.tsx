import { useEffect, useMemo, useState } from 'react';
import { Listbox, ListboxOption } from 'ui-components';

import { getReportNodeType } from '@/features/integrations/pages/DownloadReport';

const severities = ['Critical', 'High', 'Medium', 'Low'];
export const CommonForm = ({
  setProvider,
  resource,
  provider,
}: {
  setProvider: React.Dispatch<React.SetStateAction<string>>;
  resource: string;
  provider: string;
}) => {
  const [severity, setSeverity] = useState<string[]>([]);

  useEffect(() => {
    setSeverity([]);
  }, [resource, provider]);

  const nodeType = useMemo(() => {
    return getReportNodeType(resource);
  }, [resource]);

  return (
    <>
      <Listbox
        variant="outline"
        label="Select Node Type"
        value={provider}
        name="nodeType"
        onChange={(value) => {
          setProvider(value);
        }}
        placeholder="Select Node Type"
        getDisplayValue={(item) => {
          return Object.keys(nodeType).find((person) => person === item) ?? '';
        }}
      >
        {Object.keys(nodeType).map((resource) => {
          return (
            <ListboxOption value={resource} key={resource}>
              {resource}
            </ListboxOption>
          );
        })}
      </Listbox>
      <Listbox
        variant="outline"
        label="Select Severity"
        value={severity}
        name="severity[]"
        onChange={(value) => {
          setSeverity(value);
        }}
        placeholder="Select Severity"
        getDisplayValue={() => {
          return 'Severity';
        }}
        multiple
        clearAll="Clear all"
      >
        {severities.map((resource) => {
          return (
            <ListboxOption value={resource} key={resource}>
              {resource}
            </ListboxOption>
          );
        })}
      </Listbox>
    </>
  );
};
