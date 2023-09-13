import { useEffect } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';

import { getSecretApiClient } from '@/api/api';
import { apiWrapper } from '@/utils/api';

const loader = async ({ params }: LoaderFunctionArgs) => {
  const scanId = params.scanId ?? '';
  const getSecretRulesForScan = apiWrapper({
    fn: getSecretApiClient().getSecretRulesForScan,
  });

  const rules = await getSecretRulesForScan({
    modelScanResultsReq: {
      scan_id: scanId,
      fields_filter: {
        compare_filter: null,
        contains_filter: { filter_in: {} },
        match_filter: { filter_in: {} },
        order_filter: { order_fields: [] },
      },
      window: {
        offset: 0,
        size: Number.MAX_SAFE_INTEGER,
      },
    },
  });

  if (!rules.ok) {
    throw rules.error;
  }

  return rules.value.rules ?? [];
};

export function useGetSecretRulesForScan({ scanId }: { scanId: string }) {
  const fetcher = useFetcher<string[]>();

  useEffect(() => {
    fetcher.load(
      generatePath(`/data-component/secret/rules/scan/:scanId`, {
        scanId: encodeURIComponent(scanId),
      }),
    );
  }, [scanId]);

  return {
    status: fetcher.state,
    rules: fetcher.data ?? [],
  };
}

export const module = {
  loader,
};
