import cx from 'classnames';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { omit, pick, truncate } from 'lodash-es';
import { Suspense, useState } from 'react';
import {
  LoaderFunctionArgs,
  useLoaderData,
  useRouteLoaderData,
  useSearchParams,
} from 'react-router-dom';
import {
  Badge,
  CircleSpinner,
  SlidingModal,
  SlidingModalCloseButton,
  SlidingModalContent,
  SlidingModalHeader,
} from 'ui-components';

import { getSearchApiClient } from '@/api/api';
import { ModelCloudCompliance } from '@/api/generated';
import { CopyToClipboard } from '@/components/CopyToClipboard';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { LoaderDataType as ScanResultsLoaderDataType } from '@/features/postures/pages/PostureCloudScanResults';
import { apiWrapper } from '@/utils/api';
import { getObjectKeys } from '@/utils/array';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { usePageNavigation } from '@/utils/usePageNavigation';

dayjs.extend(relativeTime);

type LoaderDataType = {
  error?: string;
  message?: string;
  data?: ModelCloudCompliance;
};

async function getCompliances(complianceId: string) {
  const searchCloudCompliancesApi = apiWrapper({
    fn: getSearchApiClient().searchCloudCompliances,
  });
  const result = await searchCloudCompliancesApi({
    searchSearchNodeReq: {
      node_filter: {
        filters: {
          contains_filter: {
            filter_in: {
              node_id: [complianceId],
            },
          },
          order_filter: {
            order_fields: [],
          },
          match_filter: {
            filter_in: {},
          },
          compare_filter: null,
        },
        in_field_filter: null,
        window: {
          offset: 0,
          size: 0,
        },
      },
      window: {
        offset: 0,
        size: 1,
      },
    },
  });

  if (!result.ok) {
    throw result.error;
  }

  if (result.value === null || result.value.length === 0) {
    return {
      data: undefined,
    };
  }

  const res = result.value[0];

  return res;
}
const loader = async ({
  params,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  const { complianceId } = params;

  if (!complianceId) {
    throw new Error('Compliance Id is required');
  }

  return typedDefer({
    data: getCompliances(complianceId),
  });
};

const Header = () => {
  const loaderData = useLoaderData() as LoaderDataType;
  const scanResultsLoader = useRouteLoaderData(
    'posture-cloud-scan-results',
  ) as ScanResultsLoaderDataType;

  return (
    <SlidingModalHeader>
      <Suspense fallback={<CircleSpinner size="xs" />}>
        <DFAwait resolve={loaderData.data}>
          {(compliane: LoaderDataType['data']) => {
            if (compliane === undefined) {
              return (
                <div className="flex items-center justify-center">
                  <h3 className="text-md text-gray-700 dark:text-gray-400">-</h3>
                </div>
              );
            }
            return (
              <div className="flex flex-col w-full overflow-auto">
                <div className="flex gap-x-2 items-center">
                  <span className="w-5 h-5 text-gray-500 dark:text-white">
                    <PostureIcon />
                  </span>
                  <span className="text-md text-gray-900 dark:text-white truncate">
                    {truncate(compliane.control_id ?? '')}
                  </span>
                  <Badge
                    label={compliane?.compliance_check_type?.toUpperCase()}
                    size="sm"
                  />
                  <CopyToClipboard data={compliane} />
                </div>
                <DFAwait resolve={scanResultsLoader?.data}>
                  {(scanResults: ScanResultsLoaderDataType) => {
                    return (
                      <span className="font-normal text-xs text-gray-500 dark:text-gray-400 ml-7 mt-2">
                        {dayjs(scanResults.data?.timestamp).fromNow() || '-'}
                      </span>
                    );
                  }}
                </DFAwait>
              </div>
            );
          }}
        </DFAwait>
      </Suspense>
    </SlidingModalHeader>
  );
};

const DetailsComponent = () => {
  const [openDetails, setOpenDetails] = useState(true);
  const loaderData = useLoaderData() as LoaderDataType;

  return (
    <div>
      <Suspense fallback={<CircleSpinner size="xs" />}>
        <DFAwait resolve={loaderData.data}>
          {(compliance: LoaderDataType['data']) => {
            if (compliance === undefined) {
              return (
                <div className="flex items-center p-4 justify-center">
                  <h3 className="text-md text-gray-900 dark:text-gray-400">
                    No compliance found
                  </h3>
                </div>
              );
            }
            const pickBy = [
              'updated_at',
              'description',
              'status',
              'compliance_check_type',
            ];
            const fixed = pick<ModelCloudCompliance>(compliance, pickBy);
            const others = omit<ModelCloudCompliance>(compliance, pickBy);
            return (
              <div className="text-gray-900 dark:text-gray-300 overflow-auto">
                <section>
                  <button
                    className="flex mb-2 font-medium text-xs w-full"
                    onClick={() => {
                      setOpenDetails(!openDetails);
                    }}
                  >
                    <span className="tracking-wider font-medium text-base dark:text-white">
                      DETAILS
                    </span>
                  </button>
                  <>
                    <div>
                      <div
                        className={cx(
                          'flex flex-col float-left',
                          'p-2 mr-4 w-fit rounded-lg items-center',
                          {
                            'bg-[#F05252]/20 dark:bg-[#F05252]/20 text-red-500 dark:text-[#F05252]':
                              fixed?.status?.toLowerCase() === 'alarm',
                            'bg-[#3F83F8]/20 dark:bg-[#3F83F8/20 text-[blue-500 dark:text-[#3F83F8]':
                              fixed?.status?.toLowerCase() === 'info',
                            'bg-[#0E9F6E]/30 dark:bg-[##0E9F6E]/10 text-green-500 dark:text-[#0E9F6E]':
                              fixed?.status?.toLowerCase() === 'ok',
                            'bg-[#FF5A1F]/20 dark:bg-[#FF5A1F]/10 text-orange-500 dark:text-[#FF5A1F]':
                              fixed?.status?.toLowerCase() === 'warn',
                            'bg-[#6B7280]/20 dark:bg-[#6B7280]/10 text-gray-700 dark:text-gray-300':
                              fixed?.status?.toLowerCase() === 'skip',
                            'bg-[#0E9F6E]/10 dark:bg-[#0E9F6E]/10 text-green-500 dark:text-[#0E9F6E]':
                              fixed?.status?.toLowerCase() === 'pass',
                            'bg-[#d6e184]/10 dark:bg-[#d6e184]/10 text-yellow-500 dark:text-[#d6e184]':
                              fixed?.status?.toLowerCase() === 'note',
                          },
                        )}
                      >
                        <span className="text-xs text-gray-500">Status</span>
                        <span className="text-md uppercase">{fixed.status ?? '-'}</span>
                      </div>
                      <p className="text-sm pr-2 mb-2 text-justify">
                        {fixed.description}
                      </p>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-y-4">
                      {getObjectKeys(others).map((key) => {
                        const label = key.toUpperCase();
                        const isNullOrEmpty = others[key] === '' || others[key] == null;
                        return (
                          <div key={key} className="flex flex-col grow basis-1/2 px-2">
                            <span className="text-xs text-gray-500">{label}</span>
                            <span className="text-sm">
                              {isNullOrEmpty ? '-' : others[key]?.toString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                </section>
              </div>
            );
          }}
        </DFAwait>
      </Suspense>
    </div>
  );
};

const PostureCloudDetailModal = () => {
  const { navigate } = usePageNavigation();
  const [searchParams] = useSearchParams();
  return (
    <SlidingModal
      open={true}
      onOpenChange={() => {
        navigate(`..?${searchParams.toString()}`);
      }}
      width={'w-2/6'}
    >
      <SlidingModalCloseButton />
      <Header />
      <SlidingModalContent>
        <DetailsComponent />
      </SlidingModalContent>
    </SlidingModal>
  );
};

export const module = {
  loader,
  element: <PostureCloudDetailModal />,
};
