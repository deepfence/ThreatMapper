import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import {
  ContainerImagesListType,
  useGetContainerImagesList,
} from '@/features/common/data-component/searchContainerImagesApiLoader';
import { ScanTypeEnum } from '@/types/common';

export type Props = {
  scanType: ScanTypeEnum;
  onChange?: (value: string[]) => void;
};
export const SearchableImageList = ({ scanType, onChange }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [imageList, setImageList] = useState<ContainerImagesListType[]>([]);

  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const { containerImages, status: listImageStatus } = useGetContainerImagesList({
    scanType,
    searchText: searchQuery,
    offset: offset,
  });

  useEffect(() => {
    if (containerImages.length > 0) {
      setImageList((_containerImages) => [..._containerImages, ...containerImages]);
    }
  }, [containerImages]);

  const searchContainerImage = debounce((query) => {
    setSearchQuery(query);
  }, 1000);

  const onEndReached = () => {
    if (containerImages.length > 0) {
      setOffset((offset) => offset + 15);
    }
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
      {listImageStatus !== 'idle' && imageList.length === 0 ? (
        <CircleSpinner size="xs" />
      ) : (
        <>
          <Combobox
            multiple
            sizing="sm"
            label="Select Image"
            name="imageFilter"
            value={selectedImages}
            onChange={(value) => {
              setSelectedImages(value);
              onChange?.(value);
            }}
            onQueryChange={searchContainerImage}
            onEndReached={onEndReached}
          >
            {imageList.map((containerImage, index) => {
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
      )}
    </>
  );
};
