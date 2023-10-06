import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';

type SearchableCloudAccountProps = {
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedCVEIds?: string[];
  triggerVariant?: 'select' | 'button';
  helperText?: string;
  color?: 'error' | 'default';
  scanId: string;
};

const PAGE_SIZE = 15;
const SearchableId = ({
  onChange,
  onClearAll,
  defaultSelectedCVEIds,
  triggerVariant,
  helperText,
  color,
  scanId,
}: SearchableCloudAccountProps) => {
  const [searchText, setSearchText] = useState('');

  const [selectedCVEIds, setSelectedCVEIds] = useState<string[]>(
    defaultSelectedCVEIds ?? [],
  );

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedCVEIds(defaultSelectedCVEIds ?? []);
  }, [defaultSelectedCVEIds]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.common.searchHostFilters({
        size: PAGE_SIZE,
        searchText,
        fieldName: 'cloud_account_id',
        scanId: scanId,
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

  const searchId = debounce((query: string) => {
    setSearchText(query);
  }, 1000);

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <input
        type="text"
        name="selectedCloudAccountLength"
        hidden
        readOnly
        value={selectedCVEIds.length}
      />
      <Combobox
        startIcon={
          isFetchingNextPage ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        name="cloudAccountFilter"
        triggerVariant={triggerVariant || 'button'}
        label={isSelectVariantType ? 'Cloud account' : undefined}
        getDisplayValue={() =>
          isSelectVariantType && selectedCVEIds.length > 0
            ? `${selectedCVEIds.length} selected`
            : null
        }
        placeholder="Cloud account"
        multiple
        value={selectedCVEIds}
        onChange={(values) => {
          setSelectedCVEIds(values);
          onChange?.(values);
        }}
        onQueryChange={searchId}
        clearAllElement="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
        helperText={helperText}
        color={color}
      >
        {data?.pages
          .flatMap((page) => {
            return page.data;
          })
          .map((item, index) => {
            return (
              <ComboboxOption key={`${item}-${index}`} value={item}>
                {item}
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};

export const SearchableCloudAccount = (props: SearchableCloudAccountProps) => {
  const { triggerVariant } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <Combobox
          label={isSelectVariantType ? 'Cloud account' : undefined}
          triggerVariant={triggerVariant || 'button'}
          startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
          placeholder="Cloud account"
          multiple
          onQueryChange={() => {
            // no operation
          }}
        />
      }
    >
      <SearchableId {...props} />
    </Suspense>
  );
};
