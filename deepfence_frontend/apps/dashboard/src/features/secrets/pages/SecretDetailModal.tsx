import cx from 'classnames';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { omit, pick, truncate } from 'lodash-es';
import { Suspense } from 'react';
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
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ModelSecret } from '@/api/generated/models/ModelSecret';
import { CopyToClipboard } from '@/components/CopyToClipboard';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { LoaderDataType as ScanResultsLoaderDataType } from '@/features/secrets/pages/SecretScanResults';
import { ApiError, makeRequest } from '@/utils/api';
import { getObjectKeys } from '@/utils/array';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { usePageNavigation } from '@/utils/usePageNavigation';

dayjs.extend(relativeTime);

type LoaderDataType = {
  error?: string;
  message?: string;
  data?: ModelSecret;
};

async function getSecrets(secretId: string) {
  const result = await makeRequest({
    apiFunction: getSearchApiClient().searchSecrets,
    apiArgs: [
      {
        searchSearchNodeReq: {
          node_filter: {
            filters: {
              contains_filter: {
                filter_in: {
                  node_id: [secretId],
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
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<LoaderDataType>({
        data: undefined,
      });
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
          data: undefined,
        });
      }
    },
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }

  if (result === null || result.length === 0) {
    return {
      data: undefined,
    };
  }
  return result[0];
}
const loader = async ({
  params,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  const { secretId } = params;

  if (!secretId) {
    throw new Error('Secret Id is required');
  }

  return typedDefer({
    data: getSecrets(secretId),
  });
};

const Header = () => {
  const loaderData = useLoaderData() as LoaderDataType;
  const scanResultsLoader = useRouteLoaderData(
    'secret-scan-results',
  ) as ScanResultsLoaderDataType;
  return (
    <SlidingModalHeader>
      <Suspense fallback={<CircleSpinner size="xs" />}>
        <DFAwait resolve={loaderData.data}>
          {(secret: LoaderDataType['data']) => {
            if (secret === undefined) {
              return (
                <div className="flex items-center justify-center">
                  <h3 className="text-md text-gray-700 dark:text-gray-400">-</h3>
                </div>
              );
            }
            return (
              <div className="flex flex-col w-full">
                <div className="flex gap-x-2 items-center">
                  <span className="w-5 h-5 text-gray-500 dark:text-white">
                    <SecretsIcon />
                  </span>
                  <span className="text-md text-gray-900 dark:text-white truncate">
                    {truncate(secret.name ?? '', { length: 20 })}
                  </span>
                  <Badge
                    label={secret?.level?.toUpperCase()}
                    className={cx({
                      'bg-[#de425b]/20 dark:bg-[#de425b]/20 text-[#de425b] dark:text-[#de425b]':
                        secret?.level?.toLowerCase() === 'critical',
                      'bg-[#f58055]/20 dark:bg-[#f58055/20 text-[#f58055] dark:text-[#f58055]':
                        secret?.level?.toLowerCase() === 'high',
                      'bg-[#ffd577]/30 dark:bg-[##ffd577]/10 text-yellow-400 dark:text-[#ffd577]':
                        secret?.level?.toLowerCase() === 'medium',
                      'bg-[#d6e184]/20 dark:bg-[#d6e184]/10 text-yellow-300 dark:text-[#d6e184]':
                        secret?.level?.toLowerCase() === 'low',
                      'bg-[#9CA3AF]/10 dark:bg-[#9CA3AF]/10 text-gray-400 dark:text-[#9CA3AF]':
                        secret?.level?.toLowerCase() === 'unknown',
                    })}
                    size="sm"
                  />
                  <CopyToClipboard data={secret} />
                </div>
                <DFAwait resolve={scanResultsLoader?.data}>
                  {(scanResults: ScanResultsLoaderDataType) => {
                    return (
                      <span className="font-normal text-xs text-gray-500 dark:text-gray-400 ml-7">
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
  const loaderData = useLoaderData() as LoaderDataType;

  return (
    <div>
      <Suspense fallback={<CircleSpinner size="xs" />}>
        <DFAwait resolve={loaderData.data}>
          {(secret: LoaderDataType['data']) => {
            if (secret === undefined) {
              return (
                <div className="flex items-center p-4 justify-center">
                  <h3 className="text-md text-gray-900 dark:text-gray-400">
                    No details found
                  </h3>
                </div>
              );
            }
            const pickBy = ['updated_at', 'name', 'full_filename', 'level', 'score'];
            const fixed = pick<ModelSecret>(secret, pickBy);
            const others = omit<ModelSecret>(secret, pickBy);

            return (
              <div className="text-gray-900 dark:text-gray-300">
                <section>
                  <h3 className="flex mb-2 font-medium text-sm w-full racking-wider dark:text-white">
                    DETAILS
                  </h3>
                  <>
                    <div>
                      <div
                        className={cx(
                          'flex flex-col float-left',
                          'p-2 mr-4 w-fit rounded-lg items-center',
                          {
                            'bg-[#de425b]/20 dark:bg-[#de425b]/20 text-[#de425b] dark:text-[#de425b]':
                              fixed?.level?.toLowerCase() === 'critical',
                            'bg-[#f58055]/20 dark:bg-[#f58055/20 text-[#f58055] dark:text-[#f58055]':
                              fixed?.level?.toLowerCase() === 'high',
                            'bg-[#ffd577]/30 dark:bg-[##ffd577]/10 text-yellow-400 dark:text-[#ffd577]':
                              fixed?.level?.toLowerCase() === 'medium',
                            'bg-[#d6e184]/20 dark:bg-[#d6e184]/10 text-yellow-300 dark:text-[#d6e184]':
                              fixed?.level?.toLowerCase() === 'low',
                            'bg-[#9CA3AF]/10 dark:bg-[#9CA3AF]/10 text-gray-400 dark:text-[#9CA3AF]':
                              fixed?.level?.toLowerCase() === 'unknown',
                          },
                        )}
                      >
                        <span className="text-xs text-gray-500">CVSS score</span>
                        <span className="text-md">{fixed.score || '-'}</span>
                      </div>
                      <p className="text-sm pr-2 mb-2 text-justify">{fixed.name}</p>
                      <span className="mt-2 text-sm pr-2">{fixed.full_filename}</span>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-y-4">
                      {getObjectKeys(others).map((key) => {
                        const label = key.replaceAll('_', ' ').toUpperCase();
                        return (
                          <div key={key} className="flex flex-col grow basis-1/2 px-2">
                            <span className="text-xs text-gray-500">{label}</span>
                            <span className="text-sm">
                              {others[key] === '' ? '-' : others[key]?.toString()}
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

const SecretDetailModals = () => {
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
  element: <SecretDetailModals />,
};
