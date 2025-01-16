import { useSuspenseQuery } from '@suspensive/react-query';
import { QueryObserver } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { Tooltip } from 'ui-components';

import { InfoStandardIcon } from '@/components/icons/common/InfoStandard';
import { queryClient } from '@/queries/client';
import { settingQueries } from '@/queries/setting';
import { isThreatMapper } from '@/utils/version';

const BANNER_HEIGHT = 32;

function useDatabaseInfo() {
  const { data } = useSuspenseQuery(settingQueries.getDatabaseInfo());
  return {
    ...data,
    bannerHeight: BANNER_HEIGHT,
  };
}

export function useCachedDatabaseInfo() {
  const [observer] = useState(() => {
    return new QueryObserver<{
      lastUpdated: Date | undefined;
      daysOld: number | undefined;
      showBanner: boolean;
    }>(queryClient, {
      queryKey: settingQueries.getDatabaseInfo().queryKey,
    });
  });

  const [data, setData] = useState<{
    lastUpdated: Date | undefined;
    daysOld: number | undefined;
    showBanner: boolean;
    bannerHeight: number;
  }>({
    lastUpdated: undefined,
    daysOld: undefined,
    showBanner: false,
    bannerHeight: BANNER_HEIGHT,
  });

  useEffect(() => {
    const unsubscribe = observer.subscribe((result) => {
      setData({
        ...(result.data ?? {
          lastUpdated: undefined,
          daysOld: undefined,
          showBanner: false,
        }),
        bannerHeight: BANNER_HEIGHT,
      });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return data;
}

export function FeedAgeBanner() {
  if (isThreatMapper) {
    return (
      <Suspense fallback={null}>
        <FeedAgeBannerContent />
      </Suspense>
    );
  }
  return null;
}

function FeedAgeBannerContent() {
  const { showBanner, daysOld } = useDatabaseInfo();
  if (!showBanner) return null;
  return (
    <div
      className="bg-status-error dark:bg-red-700 w-full sticky top-0 z-[1] flex items-center justify-center gap-2 px-2"
      style={{ height: BANNER_HEIGHT }}
    >
      <p className="text-sm font-semibold text-text-text-inverse dark:text-white truncate">
        Important: The Vulnerability database has not been updated in over {daysOld}{' '}
        day(s). Your security posture may be at risk. Please reach out to{' '}
        <a href="mailto:support@deepfence.io" className="underline">
          support@deepfence.io
        </a>{' '}
        for daily feeds
      </p>
      <Tooltip
        content="ThreatMapper, by default, now gets its vulnerability feeds once a quarter. Daily Vulnerability feeds are part of a paid offering now. Please get the latest version of Vulnerability feeds for accurate posture."
        placement="top"
      >
        <div className="h-4 w-4 text-text-text-inverse dark:text-white">
          <InfoStandardIcon />
        </div>
      </Tooltip>
    </div>
  );
}
