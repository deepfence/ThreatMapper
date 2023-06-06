import * as LabelPrimitive from '@radix-ui/react-label';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import cx from 'classnames';
import { cva, VariantProps } from 'cva';
import React from 'react';
import { IconContext } from 'react-icons';

import { ObjectWithNonNullableValues } from '@/types/utils';

export type SizeType = 'md';
export type TabVariantProps = ObjectWithNonNullableValues<
  VariantProps<typeof tabListCva>
>;
export type TabProps = TabsPrimitive.TabsProps & {
  size?: SizeType;
  tabs: {
    label: string;
    value: string;
    id?: string | number;
    icon?: React.ReactNode;
  }[];
  value: string;
  children: React.ReactNode;
  variant?: keyof TabVariantProps;
};

const labelCva = cva('cursor-pointer uppercase');
const tabListCva = cva(
  ['inline-flex cursor-pointer', 'text-center text-gray-500 dark:text-[#ADBBC4]'],
  {
    variants: {
      underline: {
        true: ['border-b border-gray-200 dark:border-bg-grid-border'],
      },
    },
    defaultVariants: {
      underline: true,
    },
  },
);

const tabItemCva = cva(['outline-none text-t4 cursor-pointer'], {
  variants: {
    size: {
      md: '',
    },
    underline: {
      true: [
        cx(
          'pt-[15px] px-3 flex items-center',
          'radix-state-active:pb-[6px] radix-state-inactive:pb-[9px] ',
          'radix-state-active:border-b-[3px] radix-state-active:text-text-input-value radix-state-active:border-accent-accent',
        ),
      ],
    },
  },
  defaultVariants: {
    underline: true,
    size: 'md',
  },
});

const Tabs = (props: TabProps) => {
  const { tabs, value, size = 'md', children, variant = 'underline', ...rest } = props;
  return (
    <TabsPrimitive.Root {...rest} data-testid={'tabs-testid'} value={value}>
      <TabsPrimitive.List
        className={tabListCva({
          underline: variant === 'underline',
        })}
      >
        {tabs.map(({ label, value, id, icon }) => {
          const _id = id ? id.toString() : value;
          return (
            <TabsPrimitive.Trigger
              key={`tab-trigger-${value}`}
              value={value}
              data-testid={`tab-item-${_id}`}
              className={tabItemCva({
                underline: variant === 'underline',
                size,
              })}
            >
              {icon && (
                <IconContext.Provider value={{ className: cx('w-3 h-3 mr-1 inline') }}>
                  {icon}
                </IconContext.Provider>
              )}
              <LabelPrimitive.Label htmlFor={_id} className={labelCva()}>
                {label}
              </LabelPrimitive.Label>
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
      <TabsPrimitive.Content value={value}>{children}</TabsPrimitive.Content>
    </TabsPrimitive.Root>
  );
};

export default Tabs;
