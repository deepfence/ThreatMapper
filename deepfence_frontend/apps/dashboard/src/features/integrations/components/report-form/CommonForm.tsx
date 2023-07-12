import { useEffect, useMemo, useState } from 'react';
import { Listbox, ListboxOption } from 'ui-components';

import { getReportNodeType } from '@/features/integrations/pages/DownloadReport';

const severities = ['Critical', 'High', 'Medium', 'Low'];
export const CommonForm = ({
  setProvider,
  resource,
  provider,
  fieldErrors,
}: {
  setProvider: React.Dispatch<React.SetStateAction<string>>;
  resource: string;
  provider: string;
  fieldErrors: Record<string, string>;
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
        helperText={fieldErrors?.node_type}
        color={fieldErrors?.node_type ? 'error' : 'default'}
        variant="underline"
        label="Select Node Type"
        value={provider}
        name="nodeType"
        onChange={(value) => {
          setProvider(value);
        }}
        placeholder="Select node type"
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
        variant="underline"
        label="Select Severity"
        value={severity}
        name="severity[]"
        onChange={(value) => {
          setSeverity(value);
        }}
        placeholder="Select severity"
        getDisplayValue={(value) => {
          return value && value.length > 0 ? `${value.length} selected` : 'Severity';
        }}
        multiple
        clearAll="Clear"
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
