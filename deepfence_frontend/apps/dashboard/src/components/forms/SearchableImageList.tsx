import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  CircleSpinner,
  ComboboxV2Content,
  ComboboxV2Item,
  ComboboxV2Provider,
  ComboboxV2TriggerButton,
  ComboboxV2TriggerInput,
} from 'ui-components';

import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';
import { useDebouncedValue } from '@/utils/useDebouncedValue';

export interface Props {
  scanType: ScanTypeEnum | 'none';
  onChange?: (value: string[]) => void;
  defaultSelectedImages?: string[];
  valueKey?: 'nodeId' | 'nodeName';
  active?: boolean;
  triggerVariant?: 'select' | 'button';
  isScannedForVulnerabilities?: boolean;
  isScannedForSecrets?: boolean;
  isScannedForMalware?: boolean;
}
const fieldName = 'imageFilter';
const PAGE_SIZE = 15;
const SearchableImage = ({
  scanType,
  onChange,
  defaultSelectedImages,
  valueKey = 'nodeId',
  active,
  triggerVariant,
  isScannedForVulnerabilities,
  isScannedForSecrets,
  isScannedForMalware,
}: Props) => {
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebouncedValue(searchText, 500);

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
        searchText: debouncedSearchText,
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
        if (lastPage.containerImages.length < PAGE_SIZE) return null;
        return allPages.length * PAGE_SIZE;
      },
      getPreviousPageParam: (firstPage, allPages) => {
        if (!allPages.length) return 0;
        return (allPages.length - 1) * PAGE_SIZE;
      },
    });

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <ComboboxV2Provider
      selectedValue={selectedImages}
      setSelectedValue={(values) => {
        setSelectedImages(values as string[]);
        onChange?.(values as string[]);
      }}
      value={searchText}
      setValue={setSearchText}
      defaultSelectedValue={defaultSelectedImages}
      name={fieldName}
      loading={isFetchingNextPage}
    >
      {isSelectVariantType ? (
        <ComboboxV2TriggerInput
          getDisplayValue={() =>
            selectedImages.length > 0 ? `${selectedImages.length} selected` : null
          }
          placeholder="Select container image"
          label="Container image"
        />
      ) : (
        <ComboboxV2TriggerButton>Select container image</ComboboxV2TriggerButton>
      )}
      <ComboboxV2Content
        width={isSelectVariantType ? 'anchor' : 'fixed'}
        clearButtonContent="Clear"
        onEndReached={onEndReached}
        searchPlaceholder="Search"
      >
        {data?.pages
          .flatMap((page) => {
            return page.containerImages;
          })
          .map((image, index) => {
            return (
              <ComboboxV2Item key={`${image.nodeId}-${index}`} value={image[valueKey]}>
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
              </ComboboxV2Item>
            );
          })}
      </ComboboxV2Content>
    </ComboboxV2Provider>
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
          <ComboboxV2Provider
            defaultSelectedValue={defaultSelectedImages}
            name={fieldName}
          >
            {isSelectVariantType ? (
              <ComboboxV2TriggerInput
                placeholder="Select container image"
                label="Container image"
                startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
              />
            ) : (
              <ComboboxV2TriggerButton
                startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
              >
                Select container image
              </ComboboxV2TriggerButton>
            )}
          </ComboboxV2Provider>
        </>
      }
    >
      <SearchableImage {...props} />
    </Suspense>
  );
};
