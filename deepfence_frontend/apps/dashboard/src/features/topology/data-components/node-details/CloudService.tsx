import { useEffect, useState } from 'react';
import { HiLocationMarker, HiShieldExclamation, HiUser } from 'react-icons/hi';
import { generatePath, Link, LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import { Card, CircleSpinner, Pagination, SlidingModalContent } from 'ui-components';

import { getSearchApiClient } from '@/api/api';
import { ModelCloudResource, SearchSearchNodeReq } from '@/api/generated';
import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SEVERITY_COLORS } from '@/constants/charts';
import { Header } from '@/features/topology/components/node-details/Header';
import { ApiError, makeRequest } from '@/utils/api';
import { getPageFromSearchParams } from '@/utils/table';

export type LoaderData = {
  resources: ModelCloudResource[];
  currentPage: number;
  totalRows: number;
};

const PAGE_SIZE = 15;

const loader = async ({ params, request }: LoaderFunctionArgs): Promise<LoaderData> => {
  const url = new URL(request.url);
  const nodeType = params.nodeType;
  const cloudRegion = url.searchParams.get('cloud_region');
  const page = getPageFromSearchParams(url.searchParams);

  if (!nodeType) {
    throw new Error('nodeType is required');
  }

  const searchSearchNodeReq: SearchSearchNodeReq = {
    node_filter: {
      filters: {
        compare_filter: [],
        match_filter: {
          filter_in: {
            resource_id: [nodeType], // node type filter works with resource_id key somehow
            cloud_region: [cloudRegion],
          },
        },
        contains_filter: { filter_in: {} },
        order_filter: { order_fields: [] },
      },
      in_field_filter: [],
      window: {
        offset: 0,
        size: 0,
      },
    },
    window: { offset: page * PAGE_SIZE, size: PAGE_SIZE },
  };

  const resourcesResults = await makeRequest({
    apiFunction: getSearchApiClient().searchCloudResources,
    apiArgs: [
      {
        searchSearchNodeReq,
      },
    ],
  });
  if (ApiError.isApiError(resourcesResults)) {
    throw new Error(`Failed to load cloud resoures : ${nodeType}`);
  }
  const resourcesCountResults = await makeRequest({
    apiFunction: getSearchApiClient().searchCloudResourcesCount,
    apiArgs: [
      {
        searchSearchNodeReq: {
          ...searchSearchNodeReq,
          window: {
            ...searchSearchNodeReq.window,
            size: 10 * searchSearchNodeReq.window.size,
          },
        },
      },
    ],
  });
  if (ApiError.isApiError(resourcesCountResults)) {
    throw new Error(`Failed to load cloud resoures count : ${nodeType}`);
  }

  return {
    resources: resourcesResults,
    currentPage: page,
    totalRows: page * PAGE_SIZE + resourcesCountResults.count,
  };
};

export const CloudService = ({
  nodeType,
  region,
  onGoBack,
  showBackBtn,
  onStartScanClick,
}: {
  nodeType: string;
  region: string;
  onGoBack: () => void;
  showBackBtn: boolean;
  onNodeClick: (nodeId: string, nodeType: string) => void;
  onStartScanClick: (scanOptions: ConfigureScanModalProps['scanOptions']) => void;
}) => {
  const fetcher = useFetcher<LoaderData>();
  const [page, setPage] = useState(0);
  useEffect(() => {
    const searchParams = new URLSearchParams();
    searchParams.set('cloud_region', region);
    searchParams.set('page', page.toString());
    fetcher.load(
      generatePath('/topology/node-details/cloud-service/:nodeType', { nodeType }) +
        `?${searchParams.toString()}`,
    );
  }, [nodeType, region, page]);

  const header = (
    <Header
      onStartScanClick={onStartScanClick}
      nodeId={nodeType}
      label={nodeType}
      nodeType={nodeType}
      onGoBack={onGoBack}
      showBackBtn={showBackBtn}
    />
  );

  if (fetcher.state === 'loading' && !fetcher.data) {
    return (
      <>
        {header}
        <SlidingModalContent>
          <div className="h-full flex items-center justify-center">
            <CircleSpinner />
          </div>
        </SlidingModalContent>
      </>
    );
  } else if (!fetcher.data?.resources?.length) {
    return (
      <>
        {header}
        <SlidingModalContent>
          <div className="flex justify-center pt-4">
            <div className="text-gray-500 dark:text-gray-400">No resources found</div>
          </div>
        </SlidingModalContent>
      </>
    );
  }

  return (
    <>
      {header}
      <SlidingModalContent>
        {fetcher.data?.resources.map((resource) => (
          <div key={resource.node_id}>
            <Card className="py-2 px-3 w-full mb-4">
              <div className="flex flex-col gap-2">
                <div className="text-base text-gray-700 dark:text-gray-300 font-semibold">
                  {resource.node_name || resource.node_id || '-'}
                </div>
                <div className="flex text-sm gap-1 text-gray-600 dark:text-gray-400">
                  <HiUser /> {resource.account_id}
                </div>
                <div className="flex text-sm gap-4 text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1 uppercase">
                    <HiLocationMarker /> {resource.cloud_region}
                  </div>
                  <div className="uppercase flex items-center gap-1">
                    <div className="h-4 w-4">
                      <PostureIcon />
                    </div>
                    status:{' '}
                    <ScanStatusBadge status={resource.cloud_compliance_scan_status} />
                  </div>
                  {!!resource.cloud_compliance_scan_status?.length && (
                    <Link
                      className="uppercase flex items-center gap-1 font-bold"
                      style={{
                        color: SEVERITY_COLORS['critical'],
                      }}
                      to={generatePath('/posture/cloud/scan-results/:cloudType/:scanId', {
                        scanId: resource.cloud_compliance_latest_scan_id,
                        cloudType: getCloudTypeFromNodeType(resource.node_type),
                      })}
                    >
                      <HiShieldExclamation /> {resource.cloud_compliances_count}
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          </div>
        ))}
        <div>
          <Pagination
            onPageChange={(page) => {
              setPage(page - 1);
            }}
            totalRows={fetcher.data.totalRows}
            currentPage={page + 1}
            pageSize={PAGE_SIZE}
            siblingCount={1}
            sizing="sm"
          />
        </div>
      </SlidingModalContent>
    </>
  );
};

export const module = {
  loader,
};

function getCloudTypeFromNodeType(nodeType: string) {
  const cloudType = nodeType.split('_')[0];
  return cloudType;
}
