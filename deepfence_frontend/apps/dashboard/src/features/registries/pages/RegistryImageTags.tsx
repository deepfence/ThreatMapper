import { Suspense, useRef } from 'react';
import { FiFilter } from 'react-icons/fi';
import { HiChevronRight } from 'react-icons/hi';
import {
  Form,
  generatePath,
  LoaderFunctionArgs,
  useLoaderData,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbLink,
  Checkbox,
  IconButton,
  Popover,
  TableSkeleton,
} from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelContainerImage } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { RegistryImageTagsTable } from '@/features/registries/components/RegistryImageTagsTable';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { getPageFromSearchParams } from '@/utils/table';

const PAGE_SIZE = 15;

export type LoaderDataTypeForImageTags = {
  error?: string;
  message?: string;
  tableData: Awaited<ReturnType<typeof getTags>>;
};

async function getTags(
  nodeId: string,
  imageId: string,
  searchParams: URLSearchParams,
): Promise<{
  tags: ModelContainerImage[];
  currentPage: number;
  totalRows: number;
}> {
  const page = getPageFromSearchParams(searchParams);
  const imageTagsRequest = {
    image_filter: {
      filter_in: null,
    },
    registry_id: nodeId,
    image_id: imageId,
    window: {
      offset: page * PAGE_SIZE,
      size: PAGE_SIZE,
    },
  };
  const result = await makeRequest({
    apiFunction: getRegistriesApiClient().listImages,
    apiArgs: [
      {
        modelRegistryImagesReq: imageTagsRequest,
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
      tags: [],
      currentPage: 0,
      totalRows: 0,
    };
  }

  // count api
  const resultCounts = await makeRequest({
    apiFunction: getRegistriesApiClient().countImages,
    apiArgs: [
      {
        modelRegistryImagesReq: {
          ...imageTagsRequest,
          window: {
            ...imageTagsRequest.window,
            size: 10 * imageTagsRequest.window.size,
          },
        },
      },
    ],
  });

  if (ApiError.isApiError(resultCounts)) {
    throw resultCounts.value();
  }
  return {
    tags: result,
    currentPage: page,
    totalRows: resultCounts.count || 0,
  };
}

const loader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataTypeForImageTags>> => {
  const { account, nodeId, imageId } = params as {
    account: string;
    nodeId: string;
    imageId: string;
  };

  if (!account || !nodeId || !imageId) {
    throw new Error('Account Type, Node Id and Image Id are required');
  }
  const searchParams = new URL(request.url).searchParams;

  return typedDefer({
    tableData: getTags(nodeId, imageId, searchParams),
  });
};

const HeaderComponent = () => {
  const elementToFocusOnClose = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { account, nodeId, imageId } = useParams() as {
    account: string;
    nodeId: string;
    imageId: string;
  };

  const isFilterApplied = searchParams.has('status');

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
          <DFLink
            to={generatePath('/registries/images/:account/:nodeId', {
              account,
              nodeId,
            })}
          >
            {nodeId}
          </DFLink>
        </BreadcrumbLink>

        <BreadcrumbLink>
          <DFLink
            href="#"
            className="hover:no-underline text-gray-600 dark:text-gray-100 hover:cursor-auto"
          >
            {imageId}
          </DFLink>
        </BreadcrumbLink>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-x-4">
        <div className="relative">
          {isFilterApplied && (
            <span className="absolute -left-[2px] -top-[2px] inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
          )}
          <Popover
            triggerAsChild
            elementToFocusOnCloseRef={elementToFocusOnClose}
            content={
              <div className="dark:text-white p-4">
                <Form className="flex flex-col gap-y-6">
                  <fieldset>
                    <legend className="text-sm font-medium">Status</legend>
                    <div className="flex gap-x-4">
                      <Checkbox
                        label="Completed"
                        checked={searchParams.getAll('status').includes('complete')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('status', 'complete');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('status');
                              prev.delete('status');
                              prev.delete('page');
                              prevStatuses
                                .filter((status) => status !== 'complete')
                                .forEach((status) => {
                                  prev.append('status', status);
                                });
                              return prev;
                            });
                          }
                        }}
                      />
                      <Checkbox
                        label="In Progress"
                        checked={searchParams.getAll('status').includes('in_progress')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('status', 'in_progress');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('status');
                              prev.delete('status');
                              prevStatuses
                                .filter((status) => status !== 'in_progress')
                                .forEach((status) => {
                                  prev.append('status', status);
                                });
                              prev.delete('page');
                              return prev;
                            });
                          }
                        }}
                      />
                      <Checkbox
                        label="Not scan"
                        checked={searchParams.getAll('status').includes('not_scan')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('status', 'not_scan');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('status');
                              prev.delete('status');
                              prevStatuses
                                .filter((status) => status !== 'not_scan')
                                .forEach((status) => {
                                  prev.append('status', status);
                                });
                              prev.delete('page');
                              return prev;
                            });
                          }
                        }}
                      />
                      <Checkbox
                        label="Error"
                        checked={searchParams.getAll('status').includes('error')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('status', 'error');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('status');
                              prev.delete('status');
                              prev.delete('page');
                              prevStatuses
                                .filter((status) => status !== 'error')
                                .forEach((status) => {
                                  prev.append('status', status);
                                });
                              return prev;
                            });
                          }
                        }}
                      />
                    </div>
                  </fieldset>
                </Form>
              </div>
            }
          >
            <IconButton
              className="rounded-lg"
              size="xs"
              outline
              color="primary"
              ref={elementToFocusOnClose}
              icon={<FiFilter />}
            />
          </Popover>
        </div>
      </div>
    </div>
  );
};

const RegistryImageTags = () => {
  const loaderData = useLoaderData() as LoaderDataTypeForImageTags;

  return (
    <>
      <HeaderComponent />
      <div className="p-4">
        <Suspense
          fallback={
            <>
              <div className="h-4 w-28 mt-4 mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <TableSkeleton columns={8} rows={10} size={'sm'} />
            </>
          }
        >
          <DFAwait resolve={loaderData.tableData}>
            {(resolvedData: LoaderDataTypeForImageTags['tableData']) => {
              const { tags, currentPage, totalRows } = resolvedData;
              return (
                <RegistryImageTagsTable
                  data={tags}
                  pagination={{
                    totalRows,
                    currentPage,
                  }}
                />
              );
            }}
          </DFAwait>
        </Suspense>
      </div>
    </>
  );
};

export const module = {
  loader,
  element: <RegistryImageTags />,
};
