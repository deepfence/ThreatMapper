import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';

type SearchableTestNumberProps = {
  scanId: string;
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedTestNumber?: string[];
  triggerVariant?: 'select' | 'button';
  helperText?: string;
  color?: 'error' | 'default';
};

const PAGE_SIZE = 15;
const SearchableTestNumber = ({
  scanId,
  onChange,
  onClearAll,
  defaultSelectedTestNumber,
  triggerVariant,
  helperText,
  color,
}: SearchableTestNumberProps) => {
  const [searchText, setSearchText] = useState('');

  const [selectedTestNumber, setSelectedTestNumber] = useState<string[]>(
    defaultSelectedTestNumber ?? [],
  );

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedTestNumber(defaultSelectedTestNumber ?? []);
  }, [defaultSelectedTestNumber]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.common.searchPostureCompletionFilters({
        size: PAGE_SIZE,
        searchText,
        fieldName: 'test_number',
        scanId,
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

  const searchTestNumber = debounce((query: string) => {
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
        name="postureTestNumber"
        triggerVariant={triggerVariant || 'button'}
        label={isSelectVariantType ? 'ID' : undefined}
        getDisplayValue={() =>
          isSelectVariantType && selectedTestNumber.length > 0
            ? `${selectedTestNumber.length} selected`
            : null
        }
        placeholder="ID"
        multiple
        value={selectedTestNumber}
        onChange={(values) => {
          setSelectedTestNumber(values);
          onChange?.(values);
        }}
        onQueryChange={searchTestNumber}
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

export const SearchablePostureTestNumber = (props: SearchableTestNumberProps) => {
  const { triggerVariant } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <Combobox
          label={isSelectVariantType ? 'ID' : undefined}
          triggerVariant={triggerVariant || 'button'}
          startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
          placeholder="ID"
          multiple
          onQueryChange={() => {
            // no operation
          }}
        />
      }
    >
      <SearchableTestNumber {...props} />
    </Suspense>
  );
};
