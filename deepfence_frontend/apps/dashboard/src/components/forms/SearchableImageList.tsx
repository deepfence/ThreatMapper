import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';

export type Props = {
  scanType: ScanTypeEnum | 'none';
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedImages?: string[];
  valueKey?: 'nodeId' | 'nodeName';
  active?: boolean;
  triggerVariant?: 'select' | 'button';
  isScannedForVulnerabilities?: boolean;
  isScannedForSecrets?: boolean;
  isScannedForMalware?: boolean;
};
const fieldName = 'imageFilter';
const PAGE_SIZE = 15;
const SearchableImage = ({
  scanType,
  onChange,
  onClearAll,
  defaultSelectedImages,
  valueKey = 'nodeId',
  active,
  triggerVariant,
  isScannedForVulnerabilities,
  isScannedForSecrets,
  isScannedForMalware,
}: Props) => {
  const [searchText, setSearchText] = useState('');

  const [selectedImages, setSelectedImages] = useState<string[]>(
    defaultSelectedImages ?? [],
  );

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedImages(defaultSelectedImages ?? []);
  }, [defaultSelectedImages]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.search.containerImages({
        scanType,
        size: PAGE_SIZE,
        searchText,
        active,
        isScannedForVulnerabilities,
        isScannedForSecrets,
        isScannedForMalware,
        order: {
          sortBy: 'node_name',
          descending: false,
        },
      }),
      keepPreviousData: true,
      getNextPageParam: (lastPage, allPages) => {
        return allPages.length * PAGE_SIZE;
      },
      getPreviousPageParam: (firstPage, allPages) => {
        if (!allPages.length) return 0;
        return (allPages.length - 1) * PAGE_SIZE;
      },
    });

  const searchContainerImage = debounce((query) => {
    setSearchText(query);
  }, 1000);

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <Combobox
        startIcon={
          isFetchingNextPage ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        name={fieldName}
        triggerVariant={triggerVariant || 'button'}
        label={isSelectVariantType ? 'Container image' : undefined}
        getDisplayValue={() =>
          isSelectVariantType && selectedImages.length > 0
            ? `${selectedImages.length} selected`
            : null
        }
        placeholder="Select container image"
        multiple
        value={selectedImages}
        onChange={(values) => {
          setSelectedImages(values);
          onChange?.(values);
        }}
        onQueryChange={searchContainerImage}
        clearAllElement="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
      >
        {data?.pages
          .flatMap((page) => {
            return page.containerImages;
          })
          .map((image, index) => {
            return (
              <ComboboxOption key={`${image.nodeId}-${index}`} value={image[valueKey]}>
                <div>
                  {image.nodeName}
                  {image.tagList.length > 1 ? (
                    <div className="text-p8 dark:text-df-gray-500 ">
                      <div className="pt-1">All Tags:</div>
                      {image.tagList.map((tag) => {
                        return (
                          <div key={tag} className="pl-2">
                            {tag}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};

export const SearchableImageList = (props: Props) => {
  const { triggerVariant, defaultSelectedImages = [] } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <>
          <Combobox
            name={fieldName}
            value={defaultSelectedImages}
            label={isSelectVariantType ? 'Container image' : undefined}
            triggerVariant={triggerVariant || 'button'}
            startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
            placeholder="Select container image"
            multiple
            onQueryChange={() => {
              // no operation
            }}
          />
        </>
      }
    >
      <SearchableImage {...props} />
    </Suspense>
  );
};
