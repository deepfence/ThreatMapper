import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';

export interface SearchableRegistryAccountListProps {
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedRegistryAccounts?: string[];
  valueKey?: 'nodeId' | 'nodeName';
  triggerVariant?: 'select' | 'button';
  helperText?: string;
  color?: 'error' | 'default';
  displayValue?: string;
}

const PAGE_SIZE = 15;
const SearchableRegistryAccount = ({
  onChange,
  onClearAll,
  defaultSelectedRegistryAccounts,
  valueKey = 'nodeId',
  triggerVariant,
  helperText,
  color,
  displayValue,
}: SearchableRegistryAccountListProps) => {
  const [searchText, setSearchText] = useState('');

  const [selectedRegistryAccounts, setSelectedRegistryAccounts] = useState<string[]>(
    defaultSelectedRegistryAccounts ?? [],
  );

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedRegistryAccounts(defaultSelectedRegistryAccounts ?? []);
  }, [defaultSelectedRegistryAccounts]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.search.registryAccounts({
        size: PAGE_SIZE,
        searchText,
        order: {
          sortBy: 'node_id',
          descending: false,
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

  const searchRegistryAccount = debounce((query: string) => {
    setSearchText(query);
  }, 1000);

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <input
        type="text"
        name="selectedRegistryAccountsLength"
        hidden
        readOnly
        value={selectedRegistryAccounts.length}
      />
      <Combobox
        startIcon={
          isFetchingNextPage ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        name="registryAccountFilter"
        triggerVariant={triggerVariant || 'button'}
        label={isSelectVariantType ? 'Registry Account' : undefined}
        getDisplayValue={() =>
          isSelectVariantType && selectedRegistryAccounts.length > 0
            ? `${selectedRegistryAccounts.length} selected`
            : displayValue
              ? displayValue
              : 'Select registry account'
        }
        placeholder="Select registry account"
        multiple
        value={selectedRegistryAccounts}
        onChange={(values) => {
          setSelectedRegistryAccounts(values);
          onChange?.(values);
        }}
        onQueryChange={searchRegistryAccount}
        clearAllElement="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
        helperText={helperText}
        color={color}
      >
        {data?.pages
          .flatMap((page) => {
            return page.registryAccounts;
          })
          .map((registryAccount, index) => {
            return (
              <ComboboxOption
                key={`${registryAccount.nodeId}-${index}`}
                value={registryAccount[valueKey]}
              >
                {registryAccount.nodeName} ({registryAccount.registryType})
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};

export const SearchableRegistryAccountList = (
  props: SearchableRegistryAccountListProps,
) => {
  const { triggerVariant } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <Combobox
          label={isSelectVariantType ? 'Registry Account' : undefined}
          triggerVariant={triggerVariant || 'button'}
          startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
          placeholder="Select registry account"
          multiple
          onQueryChange={() => {
            // no operation
          }}
          getDisplayValue={() => {
            return props.displayValue ? props.displayValue : 'Select registry account';
          }}
        />
      }
    >
      <SearchableRegistryAccount {...props} />
    </Suspense>
  );
};
