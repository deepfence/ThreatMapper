import { Suspense } from 'react';
import { HiOutlineChevronRight } from 'react-icons/hi';
import { useLoaderData } from 'react-router-dom';
import { Card, CircleSpinner, Separator } from 'ui-components';

import { LinkButton } from '@/components/LinkButton';
import { ReactECharts } from '@/components/ReactEcharts';
import { SecretLandingLoaderData } from '@/features/secrets/pages/Secret';
import { useTheme } from '@/theme/ThemeContext';
import { DFAwait } from '@/utils/suspense';

export const SecretCountByRulenameCard = ({
  title,
  link,
}: {
  title: string;
  link: string;
}) => {
  const loaderData = useLoaderData() as SecretLandingLoaderData;
  const { mode } = useTheme();

  return (
    <Card className="w-full py-2 px-3 flex flex-col relative">
      <div className="flex items-center pb-2">
        <h4 className="flex-1 text-gray-900 font-medium text-base dark:text-white truncate">
          {title}
        </h4>
        <div className="flex ml-auto">
          <LinkButton to={link} sizing="xs">
            <>
              Go to Scans&nbsp;
              <HiOutlineChevronRight />
            </>
          </LinkButton>
        </div>
      </div>
      <Separator />
      <div className="h-[660px]">
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center">
              <CircleSpinner size="xl" />
            </div>
          }
        >
          <DFAwait resolve={loaderData.secretCountsByRulename}>
            {(resolvedData: SecretLandingLoaderData['secretCountsByRulename']) => {
              return (
                <ReactECharts
                  theme={mode === 'dark' ? 'dark' : 'light'}
                  option={{
                    backgroundColor: 'transparent',
                    tooltip: {
                      trigger: 'item',
                      formatter: '{b}: {c}',
                    },
                    series: {
                      type: 'sunburst',
                      data: resolvedData,
                      sort: 'desc',
                      label: {
                        overflow: 'truncate',
                        width: 100,
                      },
                      labelLayout: {
                        hideOverlap: true,
                      },
                      levels: [
                        {},
                        {
                          r0: '15%',
                          r: '35%',
                        },
                        {
                          r0: '35%',
                          r: '70%',
                        },
                      ],
                    },
                  }}
                />
              );
            }}
          </DFAwait>
        </Suspense>
      </div>
    </Card>
  );
};
