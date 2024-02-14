import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';

type SearchableControlProps = {
  scanId: string;
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedControl?: string[];
  triggerVariant?: 'select' | 'button';
  helperText?: string;
  color?: 'error' | 'default';
};

const PAGE_SIZE = 15;
const SearchableControlId = ({
  scanId,
  onChange,
  onClearAll,
  defaultSelectedControl,
  triggerVariant,
  helperText,
  color,
}: SearchableControlProps) => {
  const [searchText, setSearchText] = useState('');

  const [selectedControl, setSelectedControl] = useState<string[]>(
    defaultSelectedControl ?? [],
  );

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedControl(defaultSelectedControl ?? []);
  }, [defaultSelectedControl]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.common.searchPostureCloudCompletionFilters({
        size: PAGE_SIZE,
        searchText,
        fieldName: 'control_id',
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

  const searchControl = debounce((query: string) => {
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
        name="postureControl"
        triggerVariant={triggerVariant || 'button'}
        label={isSelectVariantType ? 'ID' : undefined}
        getDisplayValue={() =>
          isSelectVariantType && selectedControl.length > 0
            ? `${selectedControl.length} selected`
            : null
        }
        placeholder="ID"
        multiple
        value={selectedControl}
        onChange={(values) => {
          setSelectedControl(values);
          onChange?.(values);
        }}
        onQueryChange={searchControl}
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

export const SearchableControl = (props: SearchableControlProps) => {
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
      <SearchableControlId {...props} />
    </Suspense>
  );
};
