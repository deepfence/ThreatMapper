import { useMemo, useState } from 'react';
import { Card } from 'ui-components';

import { GraphVulnerabilityThreatGraphRequestGraphTypeEnum } from '@/api/generated';
import { ThreatGraphIcon } from '@/components/sideNavigation/icons/ThreatGraph';
import { VulnerabilityThreatGraphComponent } from '@/features/threat-graph/components/VulnerabilityThreatGraph';
import { CardHeader } from '@/features/vulnerabilities/components/landing/CardHeader';

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
    <Card className="rounded min-h-[450px] h-full flex flex-col">
      <CardHeader
        icon={<ThreatGraphIcon />}
        title={'Top Attack Paths'}
        path={'/threatgraph'}
      />
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
