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
import { ModelContainerImage, ModelRegistryImagesReq } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { FilterHeader } from '@/components/forms/FilterHeader';
import { RegistryImageTagsTable } from '@/features/registries/components/RegistryImageTagsTable';
import { apiWrapper } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { getPageFromSearchParams } from '@/utils/table';

const PAGE_SIZE = 15;

export type LoaderDataTypeForImageTags = {
  error?: string;
  message?: string;
  tableData: Awaited<ReturnType<typeof getTags>>;
};

const getVulnerabilityScanStatus = (searchParams: URLSearchParams) => {
  return searchParams.getAll('vulnerabilityScanStatus');
};

const getSecretScanStatus = (searchParams: URLSearchParams) => {
  return searchParams.getAll('secretScanStatus');
};

const getMalwareScanStatus = (searchParams: URLSearchParams) => {
  return searchParams.getAll('malwareScanStatus');
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
  const vulnerabilityScanStatus = getVulnerabilityScanStatus(searchParams);
  const secretScanStatus = getSecretScanStatus(searchParams);
  const malwareScanStatus = getMalwareScanStatus(searchParams);

  const imageTagsRequest: ModelRegistryImagesReq = {
    image_filter: {
      filter_in: {
        docker_image_name: [imageId],
      },
    },
    registry_id: nodeId,
    window: {
      offset: page * PAGE_SIZE,
      size: PAGE_SIZE,
    },
  };

  if (vulnerabilityScanStatus.length) {
    imageTagsRequest.image_filter.filter_in!['vulnerability_scan_status'] =
      vulnerabilityScanStatus;
  }

  if (secretScanStatus.length) {
    imageTagsRequest.image_filter.filter_in!['secret_scan_status'] = secretScanStatus;
  }

  if (malwareScanStatus.length) {
    imageTagsRequest.image_filter.filter_in!['malware_scan_status'] = malwareScanStatus;
  }

  const listImages = apiWrapper({ fn: getRegistriesApiClient().listImages });

  const result = await listImages({
    modelRegistryImagesReq: imageTagsRequest,
  });

  if (!result.ok) {
    throw result.error;
  }

  if (!result.value) {
    return {
      tags: [],
      currentPage: 0,
      totalRows: 0,
    };
  }

  const countImages = apiWrapper({ fn: getRegistriesApiClient().countImages });
  const resultCounts = await countImages({
    modelRegistryImagesReq: {
      ...imageTagsRequest,
      window: {
        ...imageTagsRequest.window,
        size: 10 * imageTagsRequest.window.size,
      },
    },
  });

  if (!resultCounts.ok) {
    throw resultCounts.error;
  }
  return {
    tags: result.value,
    currentPage: page,
    totalRows: page * PAGE_SIZE + (resultCounts.value.count || 0),
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

  const isFilterApplied =
    searchParams.has('vulnerabilityScanStatus') ||
    searchParams.has('secretScanStatus') ||
    searchParams.has('malwareScanStatus');

  const onResetFilters = () => {
    setSearchParams(() => {
      return {};
    });
  };

  return (
    <div className="flex p-1 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
      <Breadcrumb separator={<HiChevronRight />} transparent>
        <BreadcrumbLink>
          <DFLink to={'/registries'}>Registries</DFLink>
        </BreadcrumbLink>
        <BreadcrumbLink>
          <DFLink
            to={generatePath('/registries/:account', {
              account: encodeURIComponent(account),
            })}
          >
            {account}
          </DFLink>
        </BreadcrumbLink>

        <BreadcrumbLink>
          <DFLink
            to={generatePath('/registries/images/:account/:nodeId', {
              account: encodeURIComponent(account),
              nodeId: encodeURIComponent(nodeId),
            })}
          >
            {nodeId}
          </DFLink>
        </BreadcrumbLink>

        <BreadcrumbLink>
          <span className="inherit cursor-auto">{imageId}</span>
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
              <div className="dark:text-white">
                <FilterHeader onReset={onResetFilters} />
                <Form className="flex flex-col gap-y-6  p-4">
                  <fieldset>
                    <legend className="text-sm font-medium">
                      Vulnerability Scan Status
                    </legend>
                    <div className="flex gap-x-4 mt-1">
                      <Checkbox
                        label="Completed"
                        checked={searchParams
                          .getAll('vulnerabilityScanStatus')
                          .includes('complete')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('vulnerabilityScanStatus', 'complete');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('vulnerabilityScanStatus');
                              prev.delete('vulnerabilityScanStatus');
                              prev.delete('page');
                              prevStatuses
                                .filter((status) => status !== 'complete')
                                .forEach((status) => {
                                  prev.append('vulnerabilityScanStatus', status);
                                });
                              return prev;
                            });
                          }
                        }}
                      />
                      <Checkbox
                        label="In Progress"
                        checked={searchParams
                          .getAll('vulnerabilityScanStatus')
                          .includes('in_progress')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('vulnerabilityScanStatus', 'in_progress');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('vulnerabilityScanStatus');
                              prev.delete('vulnerabilityScanStatus');
                              prevStatuses
                                .filter((status) => status !== 'in_progress')
                                .forEach((status) => {
                                  prev.append('vulnerabilityScanStatus', status);
                                });
                              prev.delete('page');
                              return prev;
                            });
                          }
                        }}
                      />
                      <Checkbox
                        label="Not scan"
                        checked={searchParams
                          .getAll('vulnerabilityScanStatus')
                          .includes('not_scan')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('vulnerabilityScanStatus', 'not_scan');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('vulnerabilityScanStatus');
                              prev.delete('vulnerabilityScanStatus');
                              prevStatuses
                                .filter((status) => status !== 'not_scan')
                                .forEach((status) => {
                                  prev.append('vulnerabilityScanStatus', status);
                                });
                              prev.delete('page');
                              return prev;
                            });
                          }
                        }}
                      />
                      <Checkbox
                        label="Failed"
                        checked={searchParams
                          .getAll('vulnerabilityScanStatus')
                          .includes('error')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('vulnerabilityScanStatus', 'error');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('vulnerabilityScanStatus');
                              prev.delete('vulnerabilityScanStatus');
                              prev.delete('page');
                              prevStatuses
                                .filter((status) => status !== 'error')
                                .forEach((status) => {
                                  prev.append('vulnerabilityScanStatus', status);
                                });
                              return prev;
                            });
                          }
                        }}
                      />
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="text-sm font-medium">Secret Scan Status</legend>
                    <div className="flex gap-x-4 mt-1">
                      <Checkbox
                        label="Completed"
                        checked={searchParams
                          .getAll('secretScanStatus')
                          .includes('complete')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('secretScanStatus', 'complete');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('secretScanStatus');
                              prev.delete('secretScanStatus');
                              prev.delete('page');
                              prevStatuses
                                .filter((status) => status !== 'complete')
                                .forEach((status) => {
                                  prev.append('secretScanStatus', status);
                                });
                              return prev;
                            });
                          }
                        }}
                      />
                      <Checkbox
                        label="In Progress"
                        checked={searchParams
                          .getAll('secretScanStatus')
                          .includes('in_progress')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('secretScanStatus', 'in_progress');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('secretScanStatus');
                              prev.delete('secretScanStatus');
                              prevStatuses
                                .filter((status) => status !== 'in_progress')
                                .forEach((status) => {
                                  prev.append('secretScanStatus', status);
                                });
                              prev.delete('page');
                              return prev;
                            });
                          }
                        }}
                      />
                      <Checkbox
                        label="Not scan"
                        checked={searchParams
                          .getAll('secretScanStatus')
                          .includes('not_scan')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('secretScanStatus', 'not_scan');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('secretScanStatus');
                              prev.delete('secretScanStatus');
                              prevStatuses
                                .filter((status) => status !== 'not_scan')
                                .forEach((status) => {
                                  prev.append('secretScanStatus', status);
                                });
                              prev.delete('page');
                              return prev;
                            });
                          }
                        }}
                      />
                      <Checkbox
                        label="Failed"
                        checked={searchParams
                          .getAll('secretScanStatus')
                          .includes('error')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('secretScanStatus', 'error');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('secretScanStatus');
                              prev.delete('secretScanStatus');
                              prev.delete('page');
                              prevStatuses
                                .filter((status) => status !== 'error')
                                .forEach((status) => {
                                  prev.append('secretScanStatus', status);
                                });
                              return prev;
                            });
                          }
                        }}
                      />
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend className="text-sm font-medium">Malware Scan Status</legend>
                    <div className="flex gap-x-4 mt-1">
                      <Checkbox
                        label="Completed"
                        checked={searchParams
                          .getAll('malwareScanStatus')
                          .includes('complete')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('malwareScanStatus', 'complete');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('malwareScanStatus');
                              prev.delete('malwareScanStatus');
                              prev.delete('page');
                              prevStatuses
                                .filter((status) => status !== 'complete')
                                .forEach((status) => {
                                  prev.append('malwareScanStatus', status);
                                });
                              return prev;
                            });
                          }
                        }}
                      />
                      <Checkbox
                        label="In Progress"
                        checked={searchParams
                          .getAll('malwareScanStatus')
                          .includes('in_progress')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('malwareScanStatus', 'in_progress');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('malwareScanStatus');
                              prev.delete('malwareScanStatus');
                              prevStatuses
                                .filter((status) => status !== 'in_progress')
                                .forEach((status) => {
                                  prev.append('malwareScanStatus', status);
                                });
                              prev.delete('page');
                              return prev;
                            });
                          }
                        }}
                      />
                      <Checkbox
                        label="Not scan"
                        checked={searchParams
                          .getAll('malwareScanStatus')
                          .includes('not_scan')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('malwareScanStatus', 'not_scan');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('malwareScanStatus');
                              prev.delete('malwareScanStatus');
                              prevStatuses
                                .filter((status) => status !== 'not_scan')
                                .forEach((status) => {
                                  prev.append('malwareScanStatus', status);
                                });
                              prev.delete('page');
                              return prev;
                            });
                          }
                        }}
                      />
                      <Checkbox
                        label="Failed"
                        checked={searchParams
                          .getAll('malwareScanStatus')
                          .includes('error')}
                        onCheckedChange={(state) => {
                          if (state) {
                            setSearchParams((prev) => {
                              prev.append('malwareScanStatus', 'error');
                              prev.delete('page');
                              return prev;
                            });
                          } else {
                            setSearchParams((prev) => {
                              const prevStatuses = prev.getAll('malwareScanStatus');
                              prev.delete('malwareScanStatus');
                              prev.delete('page');
                              prevStatuses
                                .filter((status) => status !== 'error')
                                .forEach((status) => {
                                  prev.append('malwareScanStatus', status);
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
      <div className="p-2">
        <Suspense
          fallback={
            <>
              <div className="h-4 w-28 mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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
