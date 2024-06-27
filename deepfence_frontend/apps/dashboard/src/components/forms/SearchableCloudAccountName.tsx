import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Combobox, ComboboxOption } from 'ui-components';

import { queries } from '@/queries';
import { CloudNodeType } from '@/types/common';

type SearchableCloudAccountsListProps = {
  cloudProvider: CloudNodeType;
  onChange?: (value: string[]) => void;
  onClearAll?: () => void;
  defaultSelectedAccounts?: string[];
  valueKey?: 'nodeId' | 'nodeName';
  active?: boolean;
  triggerVariant?: 'select' | 'button';
  label?: string;
  helperText?: string;
  displayValue?: string;
  color?: 'error' | 'default';
};

const fieldName = 'account_name';
const PAGE_SIZE = 15;
const SearchableCloudAccounts = ({
  cloudProvider,
  onChange,
  onClearAll,
  defaultSelectedAccounts,
  triggerVariant,
  label,
  helperText,
  color,
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

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.common.searchCloudAccountName({
        cloudProvider: cloudProvider,
        fieldName: fieldName,
        size: PAGE_SIZE,
        searchText,
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
      <Combobox
        label={label}
        triggerVariant={triggerVariant}
        startIcon={
          isFetchingNextPage ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        name={fieldName}
        getDisplayValue={() =>
          isSelectVariantType && selectedAccounts.length > 0
            ? `${selectedAccounts.length} selected`
            : 'Name'
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

export const SearchableCloudAccountName = (props: SearchableCloudAccountsListProps) => {
  const { label, triggerVariant, displayValue, defaultSelectedAccounts = [] } = props;
  return (
    <Suspense
      fallback={
        <>
          <Combobox
            name={fieldName}
            value={defaultSelectedAccounts}
            label={label}
            triggerVariant={triggerVariant}
            startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
            getDisplayValue={() => {
              return displayValue ? displayValue : `Name`;
            }}
            multiple
            onQueryChange={() => {
              // no operation
            }}
          />
        </>
      }
    >
      <SearchableCloudAccounts {...props} />
    </Suspense>
  );
};
