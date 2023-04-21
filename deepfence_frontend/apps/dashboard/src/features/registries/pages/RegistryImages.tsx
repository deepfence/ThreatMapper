import { Suspense } from 'react';
import { IconContext } from 'react-icons';
import { FaAngleDoubleUp, FaTags } from 'react-icons/fa';
import { HiChevronRight } from 'react-icons/hi';
import {
  generatePath,
  LoaderFunctionArgs,
  Outlet,
  useLoaderData,
  useParams,
} from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbLink,
  Card,
  CircleSpinner,
  TableSkeleton,
} from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelImageStub } from '@/api/generated';
import { ModelSummary } from '@/api/generated/models/ModelSummary';
import { DFLink } from '@/components/DFLink';
import { RegistryIcon } from '@/components/sideNavigation/icons/Registry';
import { RegistryImagesTable } from '@/features/registries/components/RegistryImagesTable';
import { Mode, useTheme } from '@/theme/ThemeContext';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { getPageFromSearchParams } from '@/utils/table';

const PAGE_SIZE = 15;

export type LoaderDataTypeForImages = {
  error?: string;
  message?: string;
  images: Awaited<ReturnType<typeof getImages>>;
};

type LoaderDataTypeForSummary = {
  error?: string;
  message?: string;
  summary: Awaited<ReturnType<typeof getRegistrySummaryById>>;
};
type LoaderDataType = LoaderDataTypeForImages & LoaderDataTypeForSummary;

async function getRegistrySummaryById(nodeId: string): Promise<{
  message?: string;
  summary: ModelSummary;
}> {
  const registrySummary = await makeRequest({
    apiFunction: getRegistriesApiClient().getRegistrySummary,
    apiArgs: [
      {
        registryId: nodeId,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<{ message?: string }>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(registrySummary)) {
    throw registrySummary.value();
  }

  return {
    summary: registrySummary,
  };
}

async function getImages(
  registryId: string,
  searchParams: URLSearchParams,
): Promise<{
  images: ModelImageStub[];
  currentPage: number;
  totalRows: number;
  message?: string;
}> {
  const page = getPageFromSearchParams(searchParams);
  const imageRequest = {
    image_filter: {
      filter_in: null,
    },
    registry_id: registryId,
    window: {
      offset: page * PAGE_SIZE,
      size: PAGE_SIZE,
    },
  };
  const result = await makeRequest({
    apiFunction: getRegistriesApiClient().listImageStubs,
    apiArgs: [
      {
        modelRegistryImageStubsReq: imageRequest,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<{ message?: string }>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }

  if (!result) {
    return {
      images: [],
      currentPage: 0,
      totalRows: 0,
    };
  }
  // count api
  const resultCounts = await makeRequest({
    apiFunction: getRegistriesApiClient().countImageStubs,
    apiArgs: [
      {
        modelRegistryImageStubsReq: {
          ...imageRequest,
          window: {
            ...imageRequest.window,
            size: 10 * imageRequest.window.size,
          },
        },
      },
    ],
  });

  if (ApiError.isApiError(resultCounts)) {
    throw resultCounts.value();
  }

  return {
    images: result,
    currentPage: page,
    totalRows: resultCounts.count || 0,
  };
}

const loader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  const { nodeId } = params;

  if (!nodeId) {
    throw new Error('Registry Node Id is required');
  }
  const searchParams = new URL(request.url).searchParams;

  return typedDefer({
    summary: getRegistrySummaryById(nodeId),
    images: getImages(nodeId, searchParams),
  });
};

const HeaderComponent = () => {
  const { account, nodeId } = useParams() as {
    account: string;
    nodeId: string;
  };

  return (
    <div className="flex p-2 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
      <Breadcrumb separator={<HiChevronRight />} transparent>
        <BreadcrumbLink>
          <DFLink to={'/registries'}>REGISTRIES</DFLink>
        </BreadcrumbLink>
        <BreadcrumbLink>
          <DFLink
            to={generatePath('/registries/:account', {
              account,
            })}
          >
            {account}
          </DFLink>
        </BreadcrumbLink>

        <BreadcrumbLink>
          <span className="inherit cursor-auto">{nodeId}</span>
        </BreadcrumbLink>
      </Breadcrumb>
    </div>
  );
};

const ImagesSummaryComponent = ({ theme }: { theme: Mode }) => {
  const loaderData = useLoaderData() as LoaderDataType['summary'];
  return (
    <div className="flex flex-col gap-y-2">
      <Card className="p-4 grid grid-flow-row-dense gap-y-8">
        <Suspense
          fallback={
            <div className="min-h-[300px] flex items-center justify-center">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <DFAwait resolve={loaderData.summary}>
            {(resolvedData: LoaderDataType['summary']) => {
              const { message, summary } = resolvedData;

              if (message) {
                return (
                  <div className="w-full text-md text-gray-900 dark:text-text-white">
                    No data
                  </div>
                );
              }
              const { images = 0, tags = 0, scans_in_progress = 0 } = summary;

              return (
                <>
                  <div className="grid grid-flow-col-dense gap-x-4">
                    <div className="bg-gray-100 dark:bg-gray-500/10 rounded-lg flex items-center justify-center">
                      <div className="w-14 h-14 text-blue-500 dark:text-blue-400">
                        <RegistryIcon />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 dark:text-gray-200 tracking-wider">
                        Registry Images
                      </h4>
                      <div className="mt-2">
                        <span className="text-2xl font-light text-gray-900 dark:text-gray-200">
                          {images.toString()}
                        </span>
                        <h5 className="text-xs text-gray-500 dark:text-gray-200 mb-2">
                          Total Images
                        </h5>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-x-4 justify-center items-center">
                    <div className="gap-x-2 flex flex-col justify-center">
                      <div className="pr-4 flex items-center gap-x-2">
                        <IconContext.Provider
                          value={{
                            className: 'h-4 w-4 text-indigo-600 dark:text-indigo-400',
                          }}
                        >
                          <FaTags />
                        </IconContext.Provider>
                        <span className="text-lg text-gray-900 dark:text-gray-200 font-light">
                          {tags}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        Total Tags
                      </span>
                    </div>
                    <div className="gap-x-2 flex flex-col justify-center">
                      <div className="pr-4 flex items-center gap-x-2">
                        <IconContext.Provider
                          value={{
                            className: 'h-4 w-4 text-indigo-600 dark:text-indigo-400',
                          }}
                        >
                          <FaAngleDoubleUp />
                        </IconContext.Provider>
                        <span className="text-lg text-gray-900 dark:text-gray-200 font-light">
                          {scans_in_progress.toString()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        In Progress
                      </span>
                    </div>
                  </div>
                </>
              );
            }}
          </DFAwait>
        </Suspense>
      </Card>
    </div>
  );
};

const RegistryImages = () => {
  const { mode } = useTheme();
  const loaderData = useLoaderData() as LoaderDataType;

  return (
    <>
      <HeaderComponent />
      <div className="grid grid-cols-[400px_1fr] p-2 gap-x-2">
        <div className="self-start grid gap-y-2">
          <ImagesSummaryComponent theme={mode} />
        </div>
        <Suspense
          fallback={
            <div>
              <div className="h-4 w-28 mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <TableSkeleton columns={2} rows={10} size={'sm'} />
            </div>
          }
        >
          <DFAwait resolve={loaderData.images}>
            {(resolvedData: LoaderDataType['images']) => {
              return (
                <RegistryImagesTable
                  data={resolvedData?.images}
                  pagination={{
                    totalRows: resolvedData.totalRows,
                    currentPage: resolvedData.currentPage,
                  }}
                />
              );
            }}
          </DFAwait>
        </Suspense>
      </div>
      <Outlet />
    </>
  );
};

export const module = {
  loader,
  element: <RegistryImages />,
};
