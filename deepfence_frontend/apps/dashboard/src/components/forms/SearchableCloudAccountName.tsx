import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  CircleSpinner,
  ComboboxV2Content,
  ComboboxV2Item,
  ComboboxV2Provider,
  ComboboxV2TriggerButton,
  ComboboxV2TriggerInput,
} from 'ui-components';

import { queries } from '@/queries';
import { CloudNodeType } from '@/types/common';
import { useDebouncedValue } from '@/utils/useDebouncedValue';

interface SearchableCloudAccountsListProps {
  cloudProvider: CloudNodeType;
  onChange?: (value: string[]) => void;
  defaultSelectedAccounts?: string[];
  valueKey?: 'nodeId' | 'nodeName';
  active?: boolean;
  triggerVariant?: 'select' | 'button';
  label?: string;
  helperText?: string;
  displayValue?: string;
  color?: 'error' | 'default';
}

const fieldName = 'account_name';
const PAGE_SIZE = 15;
const SearchableCloudAccounts = ({
  cloudProvider,
  onChange,
  defaultSelectedAccounts,
  triggerVariant,
  label,
  helperText,
  color,
}: SearchableCloudAccountsListProps) => {
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebouncedValue(searchText, 500);

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
        searchText: debouncedSearchText,
      }),
      keepPreviousData: true,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.data.length < PAGE_SIZE) return null;
        return allPages.length * PAGE_SIZE;
      },
      getPreviousPageParam: (firstPage, allPages) => {
        if (!allPages.length) return 0;
        return (allPages.length - 1) * PAGE_SIZE;
      },
    });

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <ComboboxV2Provider
        loading={isFetchingNextPage}
        name={fieldName}
        defaultSelectedValue={defaultSelectedAccounts ?? []}
        selectedValue={selectedAccounts}
        setSelectedValue={(values) => {
          setSelectedAccounts(values);
          onChange?.(values);
        }}
        value={searchText}
        setValue={setSearchText}
      >
        {triggerVariant === 'select' ? (
          <ComboboxV2TriggerInput
            label={label}
            startIcon={
              isFetchingNextPage ? (
                <CircleSpinner size="sm" className="w-3 h-3" />
              ) : undefined
            }
            getDisplayValue={() =>
              selectedAccounts.length > 0 ? `${selectedAccounts.length} selected` : 'Name'
            }
            placeholder="Name"
            helperText={helperText}
            color={color}
          />
        ) : (
          <ComboboxV2TriggerButton>Name</ComboboxV2TriggerButton>
        )}
        <ComboboxV2Content
          width={isSelectVariantType ? 'anchor' : 'fixed'}
          clearButtonContent="Clear"
          onEndReached={onEndReached}
          searchPlaceholder="Search"
        >
          {data?.pages
            .flatMap((page) => {
              return page.data;
            })
            .map((item, index) => {
              return (
                <ComboboxV2Item key={`${item}-${index}`} value={item}>
                  {item}
                </ComboboxV2Item>
              );
            })}
        </ComboboxV2Content>
      </ComboboxV2Provider>
    </>
  );
};

export const SearchableCloudAccountName = (props: SearchableCloudAccountsListProps) => {
  const { label, triggerVariant, displayValue, defaultSelectedAccounts = [] } = props;
  return (
    <Suspense
      fallback={
        <>
          <ComboboxV2Provider
            name={fieldName}
            defaultSelectedValue={defaultSelectedAccounts}
            loading
          >
            {triggerVariant === 'select' ? (
              <ComboboxV2TriggerInput
                label={label}
                startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
              ></ComboboxV2TriggerInput>
            ) : (
              <ComboboxV2TriggerButton
                startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
              >
                {displayValue ? displayValue : 'Name'}
              </ComboboxV2TriggerButton>
            )}
          </ComboboxV2Provider>
        </>
      }
    >
      <SearchableCloudAccounts {...props} />
    </Suspense>
  );
};
