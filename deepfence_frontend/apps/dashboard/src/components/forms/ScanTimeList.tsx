import { useSuspenseInfiniteQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CircleSpinner, Listbox, ListboxOption } from 'ui-components';

import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';
import { formatMilliseconds } from '@/utils/date';
import { isScanComplete } from '@/utils/scan';

interface TimeListProps {
  onChange?: (data: ISelected) => void;
  onClearAll?: () => void;
  defaultSelectedTime?: number | null;
  valueKey?: 'nodeId';
  triggerVariant?: 'underline' | 'default';
  helperText?: string;
  color?: 'error' | 'default';
  nodeId?: string;
  nodeType?: string;
  scanType: string;
  skipScanTime?: number;
  noDataText?: string;
}

export interface ISelected {
  updatedAt: number;
  scanId: string;
}

const PAGE_SIZE = 10;
const ScanTime = ({
  onChange,
  onClearAll,
  defaultSelectedTime,
  triggerVariant = 'underline',
  helperText,
  color,
  nodeId,
  nodeType,
  scanType,
  skipScanTime,
  noDataText,
}: TimeListProps) => {
  const [selectedTime, setSelectedTime] = useState<number | null>(
    defaultSelectedTime ?? null,
  );

  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'underline';
  }, [triggerVariant]);

  useEffect(() => {
    setSelectedTime(defaultSelectedTime ?? null);
  }, [defaultSelectedTime]);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.common.scanHistories({
        size: PAGE_SIZE,
        nodeId: nodeId ?? '',
        nodeType: nodeType ?? '',
        scanType: scanType as ScanTypeEnum,
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

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <>
      <Listbox
        name="timeFilter"
        variant={triggerVariant}
        label={isSelectVariantType ? 'Select Scan Time' : undefined}
        getDisplayValue={() =>
          isSelectVariantType
            ? selectedTime
              ? formatMilliseconds(selectedTime)
              : ''
            : ''
        }
        placeholder="Scan time"
        value={selectedTime as unknown as ISelected}
        onChange={(value: ISelected) => {
          setSelectedTime(value.updatedAt);
          onChange?.(value);
        }}
        clearAll="Clear"
        onClearAll={onClearAll}
        onEndReached={onEndReached}
        helperText={helperText}
        color={color}
        startIcon={
          isFetchingNextPage ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
        }
        noDataText={noDataText}
      >
        {data?.pages
          .flatMap((page) => {
            return page.data;
          })
          .filter(
            (scan) => scan.updatedAt !== skipScanTime && isScanComplete(scan.status),
          )
          ?.map?.((scan) => {
            return (
              <ListboxOption
                key={scan.updatedAt}
                value={
                  {
                    updatedAt: scan.updatedAt,
                    scanId: scan.scanId,
                  } as ISelected
                }
              >
                {formatMilliseconds(scan.updatedAt)}
              </ListboxOption>
            );
          })}
      </Listbox>
    </>
  );
};

export const ScanTimeList = (props: TimeListProps) => {
  const { triggerVariant } = props;
  const isSelectVariantType = useMemo(() => {
    return triggerVariant === 'underline';
  }, [triggerVariant]);

  return (
    <Suspense
      fallback={
        <Listbox
          label={isSelectVariantType ? 'Select Scan Time' : undefined}
          variant={triggerVariant}
          startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
          placeholder="Scan time"
        />
      }
    >
      <ScanTime {...props} />
    </Suspense>
  );
};
