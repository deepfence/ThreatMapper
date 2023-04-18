import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { usePrevious } from 'react-use';
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
};
export const SearchableImageList = ({
  scanType,
  onChange,
  defaultSelectedImages,
}: Props) => {
  const [searchState, setSearchState] = useState<{
    searchText: string;
    offset: number;
    imagesList: SearchContainerImagesLoaderDataType['containerImages'];
  }>({
    searchText: '',
    offset: 0,
    imagesList: [],
  });
  const [selectedImages, setSelectedImages] = useState<string[]>(
    defaultSelectedImages ?? [],
  );

  const { containerImages } = useGetContainerImagesList({
    scanType,
    searchText: searchState.searchText,
    offset: searchState.offset,
  });

  const prevHostsLength = usePrevious(searchState.imagesList.length);

  useEffect(() => {
    if (containerImages.length > 0) {
      setSearchState((prev) => {
        return {
          ...prev,
          imagesList: [...containerImages],
        };
      });
    }
  }, [containerImages]);

  const searchContainerImage = debounce((query) => {
    setSearchState({
      searchText: query,
      offset: 0,
      imagesList: [],
    });
  }, 1000);

  const onEndReached = () => {
    setSearchState((prev) => {
      if (prevHostsLength && prevHostsLength <= prev.imagesList.length) {
        return {
          ...prev,
          offset: prev.offset + 15,
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
