import { useEffect } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';

import { getCloudNodesApiClient } from '@/api/api';
import { ModelCloudNodeAccountInfo } from '@/api/generated';
import { apiWrapper } from '@/utils/api';

export type SearchCloudAccountsLoaderDataType = {
  accounts: ModelCloudNodeAccountInfo[];
};

export const searchCloudAccountsApiLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<SearchCloudAccountsLoaderDataType> => {
  const nodeType = params?.nodeType;

  if (!nodeType) {
    throw new Error('Scan Type is required');
  }

  const listCloudNodeAccount = apiWrapper({
    fn: getCloudNodesApiClient().listCloudNodeAccount,
  });

  const result = await listCloudNodeAccount({
    modelCloudNodeAccountsListReq: {
      cloud_provider: nodeType,
      window: {
        offset: 0,
        size: Number.MAX_SAFE_INTEGER,
      },
    },
  });

  if (!result.ok) {
    throw result.error;
  }

  return {
    accounts: result.value.cloud_node_accounts_info ?? [],
  };
};

export const useGetCloudAccountsList = ({
  nodeType,
}: {
  // TODO: strongly type this
  nodeType: string;
}): {
  accounts: ModelCloudNodeAccountInfo[];
} => {
  const fetcher = useFetcher<SearchCloudAccountsLoaderDataType>();

  useEffect(() => {
    fetcher.load(
      generatePath(`/data-component/search/cloud-accounts/:nodeType`, {
        nodeType,
      }),
    );
  }, [nodeType]);

  return {
    accounts: fetcher.data?.accounts ?? [],
  };
};
