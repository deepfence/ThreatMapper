import { useEffect } from 'react';
import { HiLocationMarker, HiShieldExclamation } from 'react-icons/hi';
import { generatePath, Link, LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import { Card, CircleSpinner, SlidingModalContent } from 'ui-components';

import { getSearchApiClient } from '@/api/api';
import { ModelCloudResource } from '@/api/generated';
import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SEVERITY_COLORS } from '@/constants/charts';
import { Header } from '@/features/topology/components/node-details/Header';
import { ApiError, makeRequest } from '@/utils/api';

export type LoaderData = {
  resources: ModelCloudResource[];
};

const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderData> => {
  const nodeType = params.nodeType;

  if (!nodeType) {
    throw new Error('nodeType is required');
  }

  const lookupResult = await makeRequest({
    apiFunction: getSearchApiClient().searchCloudResources,
    apiArgs: [
      {
        searchSearchNodeReq: {
          node_filter: {
            filters: {
              compare_filter: [],
              contains_filter: {
                filter_in: {
                  // node_type: [nodeType],
                },
              },
              match_filter: { filter_in: {} },
              order_filter: { order_fields: [] },
            },
            in_field_filter: [],
            window: {
              offset: 0,
              size: 0,
            },
          },
          window: {
            offset: 0,
            size: 100,
          },
        },
      },
    ],
  });
  if (ApiError.isApiError(lookupResult) || !lookupResult.length) {
    throw new Error(`Failed to load cloud resoures : ${nodeType}`);
  }

  return {
    resources: lookupResult,
  };
};

export const CloudService = ({
  nodeType,
  onGoBack,
  showBackBtn,
  onStartScanClick,
}: {
  nodeType: string;
  onGoBack: () => void;
  showBackBtn: boolean;
  onNodeClick: (nodeId: string, nodeType: string) => void;
  onStartScanClick: (scanOptions: ConfigureScanModalProps['scanOptions']) => void;
}) => {
  const fetcher = useFetcher<LoaderData>();
  useEffect(() => {
    fetcher.load(
      generatePath('/topology/node-details/cloud-service/:nodeType', { nodeType }),
    );
  }, [nodeType]);

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
                <div className="flex text-sm gap-4 text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1 uppercase">
                    <HiLocationMarker /> ap-south-1
                  </div>
                  <div className="uppercase flex items-center gap-1">
                    <div className="h-4 w-4">
                      <PostureIcon />
                    </div>
                    status: <ScanStatusBadge status={'COMPLETE'} />
                  </div>
                  {!resource.cloud_compliance_scan_status?.length && (
                    <Link
                      className="uppercase flex items-center gap-1 font-bold"
                      style={{
                        color: SEVERITY_COLORS['critical'],
                      }}
                      to="/posture"
                    >
                      <HiShieldExclamation /> {resource.cloud_compliances_count}
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          </div>
        ))}
      </SlidingModalContent>
    </>
  );
};

export const module = {
  loader,
};
