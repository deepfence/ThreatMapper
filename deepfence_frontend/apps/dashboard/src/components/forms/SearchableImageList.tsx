import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { Combobox, ComboboxOption } from 'ui-components';

import {
  SearchContainerImagesLoaderDataType,
  useGetContainerImagesList,
} from '@/features/common/data-component/searchContainerImagesApiLoader';
import { ScanTypeEnum } from '@/types/common';

export type Props = {
  scanType: ScanTypeEnum | 'none';
  onChange?: (value: string[]) => void;
  defaultSelectedImages?: string[];
  reset?: boolean;
};

const PAGE_SIZE = 15;
export const SearchableImageList = ({
  scanType,
  onChange,
  defaultSelectedImages,
  reset,
}: Props) => {
  const [searchState, setSearchState] = useState<{
    searchText: string;
    size: number;
    imagesList: SearchContainerImagesLoaderDataType['containerImages'];
    hasNext: boolean;
  }>({
    searchText: '',
    size: PAGE_SIZE,
    imagesList: [],
    hasNext: false,
  });
  const [selectedImages, setSelectedImages] = useState<string[]>(
    defaultSelectedImages ?? [],
  );

  const { containerImages, hasNext } = useGetContainerImagesList({
    scanType,
    searchText: searchState.searchText,
    size: searchState.size,
  });

  useEffect(() => {
    setSelectedImages(defaultSelectedImages ?? []);
  }, [defaultSelectedImages]);

  useEffect(() => {
    if (reset) {
      setSearchState({
        searchText: '',
        size: PAGE_SIZE,
        imagesList: [],
        hasNext: false,
      });
      setSelectedImages([]);
    }
  }, [reset]);

  useEffect(() => {
    if (containerImages.length > 0) {
      setSearchState((prev) => {
        return {
          ...prev,
          imagesList: [...containerImages],
          hasNext,
        };
      });
    }
  }, [containerImages, hasNext]);

  const searchContainerImage = debounce((query) => {
    setSearchState({
      searchText: query,
      size: PAGE_SIZE,
      imagesList: [],
      hasNext: false,
    });
  }, 1000);

  const onEndReached = () => {
    setSearchState((prev) => {
      if (prev.hasNext) {
        return {
          ...prev,
          size: prev.size + PAGE_SIZE,
        };
      }
      return prev;
    });
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
        multiple
        sizing="sm"
        label="Select Image"
        placeholder="Select Image"
        name="imageFilter"
        value={selectedImages}
        onChange={(value) => {
          setSelectedImages(value);
          onChange?.(value);
        }}
        getDisplayValue={() => {
          return searchState.searchText;
        }}
        onQueryChange={searchContainerImage}
        onEndReached={onEndReached}
      >
        {searchState.imagesList.map((containerImage, index) => {
          return (
            <ComboboxOption
              key={`${containerImage.nodeId}-${index}`}
              value={containerImage.nodeId}
            >
              {containerImage.containerImage}
            </ComboboxOption>
          );
        })}
      </Combobox>
    </>
  );
};
