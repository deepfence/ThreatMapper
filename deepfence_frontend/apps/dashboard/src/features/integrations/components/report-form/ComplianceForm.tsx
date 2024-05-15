import { upperCase, upperFirst } from 'lodash-es';
import { useEffect, useState } from 'react';
import { Listbox, ListboxOption } from 'ui-components';

import { UtilsReportFiltersScanTypeEnum } from '@/api/generated';
import {
  getReportBenchmarkList,
  getReportNodeType,
} from '@/features/integrations/pages/DownloadReport';

const getDisplayNodeTypeValue = (resource: string, nodeType: string) => {
  if (resource === UtilsReportFiltersScanTypeEnum.CloudCompliance) {
    return upperCase(nodeType);
  }
  return upperFirst(nodeType);
};

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
          return getDisplayNodeTypeValue(resource, provider) ?? '';
        }}
      >
        {getReportNodeType(resource).map((resource) => {
          return (
            <ListboxOption value={resource} key={resource}>
              {getDisplayNodeTypeValue(resource, resource)}
            </ListboxOption>
          );
        })}
      </Listbox>
      {provider && (
        <>
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
