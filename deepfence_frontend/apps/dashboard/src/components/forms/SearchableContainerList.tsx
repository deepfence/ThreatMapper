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
import { ScanTypeEnum } from '@/types/common';
import { useDebouncedValue } from '@/utils/useDebouncedValue';

export interface Props {
  scanType: ScanTypeEnum | 'none';
  onChange?: (value: string[]) => void;
  defaultSelectedContainers?: string[];
  valueKey?: 'nodeId' | 'nodeName';
  active?: boolean;
  triggerVariant?: 'select' | 'button';
  isScannedForVulnerabilities?: boolean;
  isScannedForSecrets?: boolean;
  isScannedForMalware?: boolean;
}
const fieldName = 'containerFilter';
const PAGE_SIZE = 15;
const SearchableContainer = ({
  scanType,
  onChange,
  defaultSelectedContainers,
  valueKey = 'nodeId',
  active = true,
  triggerVariant,
  isScannedForVulnerabilities,
  isScannedForSecrets,
  isScannedForMalware,
}: Props) => {
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebouncedValue(searchText, 500);

  const [selectedContainers, setSelectedContainers] = useState<string[]>(
    defaultSelectedContainers ?? [],
  );

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedContainers(defaultSelectedContainers ?? []);
  }, [defaultSelectedContainers]);

  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.search.containers({
        scanType,
        size: PAGE_SIZE,
        searchText: debouncedSearchText,
        active,
        isScannedForVulnerabilities,
        isScannedForSecrets,
        isScannedForMalware,
        order: {
          sortBy: 'node_name',
          descending: false,
        },
      }),
      keepPreviousData: true,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.containers.length < PAGE_SIZE) return null;
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
        selectedValue={selectedContainers}
        setSelectedValue={(values) => {
          setSelectedContainers(values as string[]);
          onChange?.(values as string[]);
        }}
        value={searchText}
        setValue={setSearchText}
        defaultSelectedValue={defaultSelectedContainers}
        name={fieldName}
        loading={isFetchingNextPage}
      >
        {isSelectVariantType ? (
          <ComboboxV2TriggerInput
            getDisplayValue={() =>
              selectedContainers.length > 0
                ? `${selectedContainers.length} selected`
                : null
            }
            placeholder="Select container"
            label="Container"
          />
        ) : (
          <ComboboxV2TriggerButton>Select container</ComboboxV2TriggerButton>
        )}
        <ComboboxV2Content
          width={isSelectVariantType ? 'anchor' : 'fixed'}
          clearButtonContent="Clear"
          onEndReached={onEndReached}
          searchPlaceholder="Search"
        >
          {data?.pages
            .flatMap((page) => {
              return page.containers;
            })
            .map((container, index) => {
              return (
                <ComboboxV2Item
                  key={`${container.nodeId}-${index}`}
                  value={container[valueKey]}
                >
                  {container.nodeName}
                </ComboboxV2Item>
              );
            })}
        </ComboboxV2Content>
      </ComboboxV2Provider>
    </>
  );
};

export const SearchableContainerList = (props: Props) => {
  const { triggerVariant, defaultSelectedContainers = [] } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'select';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <>
          <ComboboxV2Provider
            defaultSelectedValue={defaultSelectedContainers}
            name={fieldName}
          >
            {isSelectVariantType ? (
              <ComboboxV2TriggerInput
                placeholder="Select container"
                label="Container"
                startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
              />
            ) : (
              <ComboboxV2TriggerButton
                startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
              >
                Select container
              </ComboboxV2TriggerButton>
            )}
          </ComboboxV2Provider>
        </>
      }
    >
      <SearchableContainer {...props} />
    </Suspense>
  );
};
