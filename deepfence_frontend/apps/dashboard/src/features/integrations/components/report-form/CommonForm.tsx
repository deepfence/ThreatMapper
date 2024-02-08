import { upperFirst } from 'lodash-es';
import { useEffect, useMemo, useState } from 'react';
import { Listbox, ListboxOption } from 'ui-components';

import { UtilsReportFiltersNodeTypeEnum } from '@/api/generated';
import { getReportNodeType } from '@/features/integrations/pages/DownloadReport';

const severities = ['Critical', 'High', 'Medium', 'Low'];
const getDisplayNodeTypeValue = (nodeType: string) => {
  if (nodeType === UtilsReportFiltersNodeTypeEnum.ContainerImage) {
    return 'Container Image';
  }
  return upperFirst(nodeType);
};
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

  const nodeTypes = useMemo(() => {
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
        getDisplayValue={() => {
          return getDisplayNodeTypeValue(provider) ?? '';
        }}
        required
      >
        {nodeTypes.map((type) => {
          return (
            <ListboxOption value={type} key={type}>
              {getDisplayNodeTypeValue(type)}
            </ListboxOption>
          );
        })}
      </Listbox>
      <Listbox
        variant="underline"
        label="Select Severity"
        value={severity}
        name="severityOrCheckType"
        onChange={(value) => {
          setSeverity(value);
        }}
        placeholder="Select severity"
        getDisplayValue={(value) => {
          return value && value.length > 0 ? `${value.length} selected` : 'Severity';
        }}
        multiple
        clearAll="Clear"
        onClearAll={() => {
          setSeverity([]);
        }}
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
