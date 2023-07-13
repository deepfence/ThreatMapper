import { useInfiniteQuery } from '@tanstack/react-query';
import { debounce } from 'lodash-es';
import { useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';

export type SearchableCloudAccountsListProps = {
  cloudProvider?: 'gcp' | 'aws' | 'azure';
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedAccounts?: string[];
  valueKey?: 'nodeId' | 'nodeName';
  active?: boolean;
  triggerVariant?: 'select' | 'button';
};

const PAGE_SIZE = 15;
export const SearchableCloudAccountsList = ({
  cloudProvider,
  onChange,
  onClearAll,
  defaultSelectedAccounts,
  valueKey = 'nodeId',
  active,
  triggerVariant,
}: SearchableCloudAccountsListProps) => {
  const [searchText, setSearchText] = useState('');

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
    defaultSelectedAccounts ?? [],
  );

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedAccounts(defaultSelectedAccounts ?? []);
  }, [defaultSelectedAccounts]);

  const { data, isFetching, hasNextPage, fetchNextPage } = useInfiniteQuery({
    ...queries.search.cloudAccounts({
      cloudProvider,
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

  const searchAccount = debounce((query: string) => {
    setSearchText(query);
  }, 1000);

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <input
        type="text"
        name="selectedCloudAccountsLength"
        hidden
        readOnly
        value={selectedAccounts.length}
      />
      <Combobox
        triggerVariant={triggerVariant}
        startIcon={
          isFetching ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        name="cloudAccountsFilter"
        getDisplayValue={() =>
          isSelectVariantType && selectedAccounts.length > 0
            ? `${selectedAccounts.length} selected`
            : cloudProvider
            ? `${cloudProvider} account`
            : 'Cloud account'
        }
        multiple
        value={selectedAccounts}
        onChange={(values) => {
          setSelectedAccounts(values);
          onChange?.(values);
        }}
        onQueryChange={searchAccount}
        clearAllElement="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
      >
        {data?.pages
          .flatMap((page) => {
            return page.accounts;
          })
          .map((account, index) => {
            return (
              <ComboboxOption
                key={`${account.nodeId}-${index}`}
                value={account[valueKey]}
              >
                {account.nodeName}
              </ComboboxOption>
            );
          })}
      </Combobox>
    </>
  );
};
