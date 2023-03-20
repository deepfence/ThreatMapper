import cx from 'classnames';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { capitalize, omit, pick, startCase, truncate } from 'lodash-es';
import { Suspense, useState } from 'react';
import { HiChevronDown } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import {
  Form,
  LoaderFunctionArgs,
  useLoaderData,
  useSearchParams,
} from 'react-router-dom';
import { Badge, CircleSpinner, ModalHeader, SlidingModal } from 'ui-components';

import { getSearchApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelCompliance } from '@/api/generated';
import { CopyToClipboardAsJson } from '@/components/CopyToClipboardIcon';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { STATUSES } from '@/features/postures/pages/PostureScanResults';
import { ApiError, makeRequest } from '@/utils/api';
import { getObjectKeys } from '@/utils/array';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { usePageNavigation } from '@/utils/usePageNavigation';

dayjs.extend(relativeTime);

type LoaderDataType = {
  error?: string;
  message?: string;
  data?: ModelCompliance;
};

async function getCompliances(complianceId: string) {
  const result = await makeRequest({
    apiFunction: getSearchApiClient().searchCompliances,
    apiArgs: [
      {
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
            },
            in_field_filter: null,
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

  const res = result[0];

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

  return (
    <ModalHeader>
      <Suspense fallback={<CircleSpinner size="xs" />}>
        <DFAwait resolve={loaderData.data}>
          {(compliane: LoaderDataType['data']) => {
            if (compliane === undefined) {
              return (
                <div className="flex items-center p-4 justify-center">
                  <h3 className="text-md text-gray-700 dark:text-gray-400">-</h3>
                </div>
              );
            }
            return (
              <div className="flex flex-col w-full p-4">
                <div className="flex gap-x-2 items-center">
                  <span className="w-5 h-5 text-gray-500 dark:text-white">
                    <PostureIcon />
                  </span>
                  <span className="text-md text-gray-900 dark:text-white truncate">
                    {truncate(compliane.test_number ?? '')}
                  </span>
                  <Badge
                    label={compliane?.compliance_check_type?.toUpperCase()}
                    size="sm"
                  />
                  <CopyToClipboardAsJson data={compliane} />
                </div>
                <span className="font-normal text-xs text-gray-500 dark:text-gray-400 ml-7">
                  {dayjs(compliane.updated_at).fromNow() || '-'}
                </span>
              </div>
            );
          }}
        </DFAwait>
      </Suspense>
    </ModalHeader>
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
              'remediation_puppet',
            ];
            const fixed = pick<ModelCompliance>(compliance, pickBy);
            const others = omit<ModelCompliance>(compliance, pickBy);
            return (
              <div className="text-gray-900 dark:text-gray-300">
                <section>
                  <button
                    className="flex mb-2 font-medium text-xs w-full"
                    onClick={() => {
                      setOpenDetails(!openDetails);
                    }}
                  >
                    <span className="tracking-wider dark:text-white">DETAILS</span>
                    <IconContext.Provider
                      value={{
                        className: cx(
                          'h-4 w-4 text-gray-900 dark:text-gray-300 ml-auto',
                          {
                            'rotate-0': openDetails === true,
                            '-rotate-90': openDetails === false,
                          },
                        ),
                      }}
                    >
                      <HiChevronDown />
                    </IconContext.Provider>
                  </button>
                  {openDetails ? (
                    <>
                      <div>
                        <div
                          className={cx(
                            'flex flex-col float-left',
                            'p-2 mr-4 w-fit rounded-lg items-center',
                            {
                              'bg-[#F05252]/20 dark:bg-[#F05252]/20 text-red-500 dark:text-[#F05252]':
                                fixed?.status?.toLowerCase() === STATUSES.ALARM,
                              'bg-[#3F83F8]/20 dark:bg-[#3F83F8/20 text-[blue-500 dark:text-[#3F83F8]':
                                fixed?.status?.toLowerCase() === STATUSES.INFO,
                              'bg-[#0E9F6E]/30 dark:bg-[##0E9F6E]/10 text-green-500 dark:text-[#0E9F6E]':
                                fixed?.status?.toLowerCase() === STATUSES.OK,
                              'bg-[#FF5A1F]/20 dark:bg-[#FF5A1F]/10 text-orange-500 dark:text-[#FF5A1F]':
                                fixed?.status?.toLowerCase() === STATUSES.WARN,
                              'bg-[#6B7280]/20 dark:bg-[#6B7280]/10 text-gray-700 dark:text-gray-300':
                                fixed?.status?.toLowerCase() === STATUSES.SKIP,
                              'bg-[#0E9F6E]/10 dark:bg-[#0E9F6E]/10 text-green-500 dark:text-[#0E9F6E]':
                                fixed?.status?.toLowerCase() === STATUSES.PASS,
                              'bg-[#d6e184]/10 dark:bg-[#d6e184]/10 text-yellow-500 dark:text-[#d6e184]':
                                fixed?.status?.toLowerCase() === STATUSES.NOTE,
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
                      <div className="mt-6 flex flex-wrap gap-y-4 gap-x-8">
                        <div className="flex flex-col">
                          <span className="text-left text-xs text-gray-500">
                            Remediation
                          </span>
                          <p className="text-sm pr-2 mb-2 text-justify">
                            {fixed.remediation_puppet}
                          </p>
                        </div>
                        {getObjectKeys(others).map((key) => {
                          const label = capitalize(
                            startCase(startCase(key)).toLowerCase(),
                          );
                          const isNullOrEmpty = others[key] === '' || others[key] == null;
                          return (
                            <div key={key} className="flex flex-col">
                              <span className="text-xs text-gray-500">{label}</span>
                              <span className="text-sm">
                                {isNullOrEmpty ? '-' : others[key]?.toString()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </section>
              </div>
            );
          }}
        </DFAwait>
      </Suspense>
    </div>
  );
};

const PostureDetailModal = () => {
  const { navigate } = usePageNavigation();
  const [searchParams] = useSearchParams();
  return (
    <SlidingModal
      header={<Header />}
      open={true}
      onOpenChange={() => {
        navigate(`..?${searchParams.toString()}`);
      }}
      width={'w-2/6'}
    >
      <Form className="p-4">
        <DetailsComponent />
      </Form>
    </SlidingModal>
  );
};

export const module = {
  loader,
  element: <PostureDetailModal />,
};
