import { useMemo, useState } from 'react';
import { Card, Separator } from 'ui-components';

import { GraphVulnerabilityThreatGraphRequestGraphTypeEnum } from '@/api/generated';
import { VulnerabilityThreatGraphComponent } from '@/features/threat-graph/components/VulnerabilityThreatGraph';

export const TopAttackPaths = () => {
  const [attackPathType] = useState<GraphVulnerabilityThreatGraphRequestGraphTypeEnum>(
    GraphVulnerabilityThreatGraphRequestGraphTypeEnum.MostVulnerableAttackPaths,
  );

  const filters = useMemo(() => {
    return {
      type: attackPathType,
    };
  }, [attackPathType]);

  return (
    <Card className="h-full p-2 min-h-[500px]">
      <div className="flex items-center pb-2">
        <h4 className="text-gray-900 font-medium text-base dark:text-white">
          Top Attack Paths
        </h4>
      </div>
      <Separator />
      <div className="flex flex-col items-center justify-center h-[96%]">
        {/* <Radio
          value={attackPathType}
          className="mt-4 self-start"
          options={[
            {
              label: 'Most vulnerable attack paths',
              value:
                GraphVulnerabilityThreatGraphRequestGraphTypeEnum.MostVulnerableAttackPaths,
            },
            {
              label: 'Paths with direct internet exposure',
              value:
                GraphVulnerabilityThreatGraphRequestGraphTypeEnum.DirectInternetExposure,
            },
            {
              label: 'Paths with indirect internet exposure',
              value:
                GraphVulnerabilityThreatGraphRequestGraphTypeEnum.IndirectInternetExposure,
            },
          ]}
          onValueChange={(value: GraphVulnerabilityThreatGraphRequestGraphTypeEnum) => {
            setAttackPathType(value);
          }}
        /> */}
        <VulnerabilityThreatGraphComponent filters={filters} />
      </div>
    </Card>
  );
};
