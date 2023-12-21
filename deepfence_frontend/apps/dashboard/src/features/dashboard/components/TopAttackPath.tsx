import { Suspense } from 'react';
import { Card, CircleSpinner } from 'ui-components';

import { ThreatGraphIcon } from '@/components/sideNavigation/icons/ThreatGraph';
import { CardHeader } from '@/features/dashboard/components/CardHeader';
import { ThreatGraphComponent } from '@/features/threat-graph/components/ThreatGraph';
import { useThemeMode } from '@/theme/ThemeContext';

export const TopAttackPaths = () => {
  const { mode } = useThemeMode();
  console.log('mode', mode);

  const gradient =
    mode === 'light'
      ? ''
      : 'linear-gradient(0deg, rgba(22, 37, 59, 0.60) 0%, rgba(22, 37, 59, 0.60) 100%), radial-gradient(48.55% 48.55% at 50.04% 51.45%, rgba(27, 47, 77, 0.35) 0%, #020617 100%)';
  return (
    <Card className="rounded-[5px] flex flex-col h-full">
      <CardHeader
        icon={<ThreatGraphIcon />}
        title="Top attack paths"
        link="/threatgraph"
      />
      <div
        className="flex flex-1 items-center justify-center"
        style={{
          background: gradient,
        }}
      >
        <Suspense fallback={<CircleSpinner size="md" />}>
          <ThreatGraphComponent
            options={{
              modes: {
                default: [
                  'drag-canvas',
                  {
                    type: '',
                    maxZoom: 0,
                    minZoom: 0,
                  },
                ],
              },
            }}
          />
        </Suspense>
      </div>
    </Card>
  );
};
