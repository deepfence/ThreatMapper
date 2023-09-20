import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';

export type Props = {
  scanType: ScanTypeEnum | 'none';
  onChange?: (value: string) => void;
  onClearAll?: () => void;
  defaultSelectedTag?: string;
  valueKey?: 'nodeId' | 'nodeName';
  active?: boolean;
  triggerVariant?: 'select' | 'button';
  filter?: {
    dockerImageName: string;
  };
};

const PAGE_SIZE = 15;
const SearchableTag = ({
  scanType,
  onChange,
  onClearAll,
  defaultSelectedTag,
  valueKey = 'nodeId',
  active,
  triggerVariant,
  filter,
}: Props) => {
  const [searchText, setSearchText] = useState('');

  const [selectedTag, setSelectedTag] = useState<string>(() => {
    return defaultSelectedTag ?? '';
  });

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedTag(defaultSelectedTag ?? '');
  }, [defaultSelectedTag]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.search.containerImages({
        scanType,
        size: PAGE_SIZE,
        searchText,
        active,
        order: {
          sortBy: 'node_name',
          descending: false,
        },
        filter: {
          dockerImageName: filter?.dockerImageName ?? '',
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

  const searchTag = debounce((query) => {
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
        name="tagFilter"
        triggerVariant={triggerVariant || 'button'}
        label={isSelectVariantType ? 'Select Image Tag' : undefined}
        getDisplayValue={(value) => {
          const found = data?.pages
            .flatMap((page) => {
              return page.containerImages;
            })
            .find((tag) => tag.nodeId === value || tag.nodeId === selectedTag);
          return found?.nodeName ?? null;
        }}
        placeholder="select tag"
        value={selectedTag}
        onChange={(value) => {
          setSelectedTag(value);
          onChange?.(value);
        }}
        onQueryChange={searchTag}
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
                <div>{image.nodeName}</div>
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};

export const SearchableTagList = (props: Props) => {
  const { triggerVariant } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <Combobox
          label={isSelectVariantType ? 'Select Image Tag' : undefined}
          triggerVariant={triggerVariant || 'button'}
          startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
          placeholder="select tag"
          multiple
          onQueryChange={() => {
            // no operation
          }}
        />
      }
    >
      <SearchableTag {...props} />
    </Suspense>
  );
};
