import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';

type SearchableCVEListProps = {
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedCVEIds?: string[];
  triggerVariant?: 'select' | 'button';
  helperText?: string;
  color?: 'error' | 'default';
  scanId: string;
};

const PAGE_SIZE = 15;
const SearchableCVE = ({
  onChange,
  onClearAll,
  defaultSelectedCVEIds,
  triggerVariant,
  helperText,
  color,
  scanId,
}: SearchableCVEListProps) => {
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
      ...queries.vulnerability.searchScanResultFilters({
        size: PAGE_SIZE,
        searchText,
        fieldName: 'cve_id',
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

  const searchCVE = debounce((query: string) => {
    setSearchText(query);
  }, 1000);

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <input
        type="text"
        name="selectedCveLength"
        hidden
        readOnly
        value={selectedCVEIds.length}
      />
      <Combobox
        startIcon={
          isFetchingNextPage ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        name="cveFilter"
        triggerVariant={triggerVariant || 'button'}
        label={isSelectVariantType ? 'CVE' : undefined}
        getDisplayValue={() =>
          isSelectVariantType && selectedCVEIds.length > 0
            ? `${selectedCVEIds.length} selected`
            : null
        }
        placeholder="CVEs"
        multiple
        value={selectedCVEIds}
        onChange={(values) => {
          setSelectedCVEIds(values);
          onChange?.(values);
        }}
        onQueryChange={searchCVE}
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

export const SearchableCVEList = (props: SearchableCVEListProps) => {
  const { triggerVariant } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <Combobox
          label={isSelectVariantType ? 'CVE' : undefined}
          triggerVariant={triggerVariant || 'button'}
          startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
          placeholder="CVEs"
          multiple
          onQueryChange={() => {
            // no operation
          }}
        />
      }
    >
      <SearchableCVE {...props} />
    </Suspense>
  );
};
