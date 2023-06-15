import { useInfiniteQuery } from '@tanstack/react-query';
import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';

export type Props = {
  scanType: ScanTypeEnum | 'none';
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedImages?: string[];
  valueKey?: 'nodeId' | 'imageName';
  active?: boolean;
};

const PAGE_SIZE = 15;
export const SearchableImageList = ({
  scanType,
  onChange,
  onClearAll,
  defaultSelectedImages,
  valueKey = 'nodeId',
  active,
}: Props) => {
  const [searchText, setSearchText] = useState('');

  const [selectedImages, setSelectedImages] = useState<string[]>(
    defaultSelectedImages ?? [],
  );

  useEffect(() => {
    setSelectedImages(defaultSelectedImages ?? []);
  }, [defaultSelectedImages]);

  const { data, isFetching, hasNextPage, fetchNextPage } = useInfiniteQuery({
    ...queries.search.containerImages({
      scanType,
      size: PAGE_SIZE,
      searchText,
      active,
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
      <input
        type="text"
        name="selectedImageLength"
        hidden
        readOnly
        value={selectedImages.length}
      />
      <Combobox
        name="imageFilter"
        getDisplayValue={() => 'Images'}
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
                {image.imageName}
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};
