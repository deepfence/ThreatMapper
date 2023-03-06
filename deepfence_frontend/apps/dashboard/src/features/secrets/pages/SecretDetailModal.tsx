import cx from 'classnames';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { capitalize, startCase } from 'lodash-es';
import { Suspense, useState } from 'react';
import { FaExpandAlt } from 'react-icons/fa';
import { HiChevronDown, HiExternalLink } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import {
  Await,
  Form,
  LoaderFunctionArgs,
  useLoaderData,
  useSearchParams,
} from 'react-router-dom';
import { Badge, CircleSpinner, ModalHeader, SlidingModal } from 'ui-components';

import { getSearchApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { CopyToClipboardAsJson } from '@/components/CopyToClipboardIcon';
import { DFLink } from '@/components/DFLink';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { usePageNavigation } from '@/utils/usePageNavigation';

dayjs.extend(relativeTime);

type CveType = {
  secretId: string;
  timestamp: number;
  ruleName: string;
  matchedContent: string;
  cveType: string;
  severity: string;
  score: number;
  urls: string[] | null;
  cveCausedByPackage: string;
  cveCausedByPackagePath: string;
  cveFixedIn: string;
  cveAttackVector: number;
  exploitPoc: string;
  others: {
    [k: string]: string | string[] | number;
  };
};

type LoaderDataType = {
  error?: string;
  message?: string;
  data?: CveType;
};
const arrayFields = ['urls'];

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
                  cve_id: [secretId],
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

  return {
    secretId: res.id,
    timestamp: res.updated_at,
    ruleName: res.name,
    matchedContent: res.matched_content,
    // cveType: res.cve_type,
    severity: res.level,
    score: res.score,
    // others: {
    //   cveCausedByPackage: res.cve_caused_by_package,
    //   cveCausedByPackagePath: res.cve_caused_by_package_path,
    //   cveFixedIn: res.cve_fixed_in,
    //   cveAttackVector: res.cve_attack_vector,
    //   exploitPoc: res.exploit_poc,
    //   urls: res.urls || [],
    // },
  };
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

  return (
    <ModalHeader>
      <Suspense fallback={<CircleSpinner size="xs" />}>
        <Await resolve={loaderData.data}>
          {(cve: LoaderDataType['data']) => {
            if (cve === undefined) {
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
                    <SecretsIcon />
                  </span>
                  <span className="text-md text-gray-900 dark:text-white">
                    {cve.secretId}
                  </span>
                  <Badge
                    label={cve.severity.toUpperCase()}
                    className={cx({
                      'bg-[#de425b]/20 dark:bg-[#de425b]/20 text-[#de425b] dark:text-[#de425b]':
                        cve.severity.toLowerCase() === 'critical',
                      'bg-[#f58055]/20 dark:bg-[#f58055/20 text-[#f58055] dark:text-[#f58055]':
                        cve.severity.toLowerCase() === 'high',
                      'bg-[#ffd577]/30 dark:bg-[##ffd577]/10 text-yellow-400 dark:text-[#ffd577]':
                        cve.severity.toLowerCase() === 'medium',
                      'bg-[#d6e184]/20 dark:bg-[#d6e184]/10 text-yellow-300 dark:text-[#d6e184]':
                        cve.severity.toLowerCase() === 'low',
                      'bg-[#9CA3AF]/10 dark:bg-[#9CA3AF]/10 text-gray-400 dark:text-[#9CA3AF]':
                        cve.severity.toLowerCase() === 'unknown',
                    })}
                    size="sm"
                  />
                  <CopyToClipboardAsJson data={cve} />
                </div>
                <span className="font-normal text-xs text-gray-500 dark:text-gray-400 ml-7">
                  {dayjs(cve.timestamp).fromNow()}
                </span>
              </div>
            );
          }}
        </Await>
      </Suspense>
    </ModalHeader>
  );
};

const DetailsComponent = () => {
  const [openDetails, setOpenDetails] = useState(true);
  const [openTopFiveAttackPath, setOpenTopFiveAttackPath] = useState(true);
  const [showArrayFields, setShowArrayFields] = useState(false);
  const loaderData = useLoaderData() as LoaderDataType;

  return (
    <div>
      <Suspense fallback={<CircleSpinner size="xs" />}>
        <Await resolve={loaderData.data}>
          {(cve: LoaderDataType['data']) => {
            if (cve === undefined) {
              return (
                <div className="flex items-center p-4 justify-center">
                  <h3 className="text-md text-gray-900 dark:text-gray-400">
                    No secret found
                  </h3>
                </div>
              );
            }
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
                              'bg-[#de425b]/20 dark:bg-[#de425b]/20 text-[#de425b] dark:text-[#de425b]':
                                cve.severity.toLowerCase() === 'critical',
                              'bg-[#f58055]/20 dark:bg-[#f58055/20 text-[#f58055] dark:text-[#f58055]':
                                cve.severity.toLowerCase() === 'high',
                              'bg-[#ffd577]/30 dark:bg-[##ffd577]/10 text-yellow-400 dark:text-[#ffd577]':
                                cve.severity.toLowerCase() === 'medium',
                              'bg-[#d6e184]/20 dark:bg-[#d6e184]/10 text-yellow-300 dark:text-[#d6e184]':
                                cve.severity.toLowerCase() === 'low',
                              'bg-[#9CA3AF]/10 dark:bg-[#9CA3AF]/10 text-gray-400 dark:text-[#9CA3AF]':
                                cve.severity.toLowerCase() === 'unknown',
                            },
                          )}
                        >
                          <span className="text-xs text-gray-500">CVSS score</span>
                          <span className="text-md">{cve.score || '-'}</span>
                        </div>
                        <p className="text-sm pr-2 mb-2 text-justify">{cve.ruleName}</p>
                        <DFLink
                          to={cve.matchedContent}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 text-sm pr-2 text-blue-600 dark:text-blue-500"
                        >
                          {cve.matchedContent}
                        </DFLink>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-y-4 gap-x-8">
                        {Object.keys(cve.others).map((key) => {
                          const label = capitalize(
                            startCase(startCase(key)).toLowerCase(),
                          );
                          return (
                            <div key={key}>
                              {arrayFields.includes(key) ? (
                                <div className="flex flex-col text-sm">
                                  <button
                                    className="flex items-center gap-x-2"
                                    onClick={() => {
                                      setShowArrayFields(!showArrayFields);
                                    }}
                                  >
                                    <span className="text-xs text-gray-500">
                                      {capitalize(
                                        startCase(startCase(key)).toLowerCase(),
                                      )}
                                    </span>
                                    <IconContext.Provider
                                      value={{
                                        className: cx('cursor-pointer h-2.5 w-2.5', {
                                          'rotate-45': showArrayFields,
                                        }),
                                      }}
                                    >
                                      <FaExpandAlt />
                                    </IconContext.Provider>
                                  </button>
                                  {!showArrayFields ? (
                                    <>...</>
                                  ) : (
                                    <>
                                      {(cve.others[key] as string[]).length === 0 ? (
                                        '-'
                                      ) : (
                                        <>
                                          <div className="text-sm">
                                            {(cve.others[key] as string[]).map((url) => {
                                              return (
                                                <div key={url}>
                                                  <DFLink
                                                    to={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex gap-x-2 items-center"
                                                  >
                                                    <IconContext.Provider
                                                      value={{
                                                        className: 'w-4 h-4',
                                                      }}
                                                    >
                                                      Link <HiExternalLink />
                                                    </IconContext.Provider>
                                                  </DFLink>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-">
                                  <span className="text-xs text-gray-500">{label}</span>
                                  <span className="text-sm">
                                    {cve.others[key] || '-'}
                                  </span>
                                </div>
                              )}
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
        </Await>
      </Suspense>
    </div>
  );
};

const SecretDetailModals = () => {
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
  element: <SecretDetailModals />,
};
