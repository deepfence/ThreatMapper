import * as LabelPrimitive from '@radix-ui/react-label';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import cx from 'classnames';
import { cva, VariantProps } from 'cva';
import React from 'react';
import { IconContext } from 'react-icons';

import { ObjectWithNonNullableValues } from '@/types/utils';

export type SizeType = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
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

const labelCva = cva('cursor-pointer font-medium', {
  variants: {
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
  },
});
const tabListCva = cva(
  ['inline-flex', 'text-sm font-medium text-center text-gray-500 dark:text-gray-400'],
  {
    variants: {
      underline: {
        true: ['gap-x-4 border-b', 'border-gray-200 dark:border-gray-700'],
      },
      tab: {
        true: [
          'shadow dark:bg-gray-700',
          'w-fit overflow-hidden',
          'divide-x divide-gray-200 rounded-lg',
          'dark:divide-gray-600',
        ],
      },
    },
    defaultVariants: {
      underline: true,
    },
  },
);

const tabItemCva = cva(
  [
    'outline-none',
    'ring-offset-0 focus-visible:radix-state-active:ring-4',
    'focus-visible:radix-state-active:ring-blue-200 dark:focus-visible:radix-state-active:ring-blue-800',
  ],
  {
    variants: {
      size: {
        xs: '',
        sm: '',
        md: '',
        lg: '',
        xl: '',
      },
      underline: {
        true: [
          'pb-2 px-3',
          'border-gray-200 dark:border-gray-700',
          'radix-state-active:border-b radix-state-active:-mb-px radix-state-active:text-blue-600 radix-state-active:border-blue-600',
        ],
      },
      tab: {
        true: [
          'inline-flex radix-state-active:text-gray-900 dark:radix-state-active:text-white',
          'radix-state-active:bg-gray-100 dark:radix-state-active:bg-gray-600',
        ],
      },
    },
    compoundVariants: [
      {
        tab: true,
        size: 'xs',
        className: 'py-2 px-3',
      },
      {
        tab: true,
        size: 'sm',
        className: 'py-2.5 px-4',
      },
      {
        tab: true,
        size: 'md',
        className: 'py-3 px-5',
      },
      {
        tab: true,
        size: 'lg',
        className: 'py-3.5 px-6',
      },
      {
        tab: true,
        size: 'xl',
        className: 'py-4 px-7',
      },
    ],
    defaultVariants: {
      underline: true,
      size: 'sm',
    },
  },
);

const Tabs = (props: TabProps) => {
  const { tabs, value, size = 'sm', children, variant = 'underline', ...rest } = props;
  return (
    <TabsPrimitive.Root {...rest} data-testid={'tabs-testid'} value={value}>
      <TabsPrimitive.List
        className={tabListCva({
          underline: variant === 'underline',
          tab: variant === 'tab',
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
                tab: variant === 'tab',
                size,
              })}
            >
              {icon && (
                <IconContext.Provider value={{ className: cx('w-4 h-4 mr-2 inline') }}>
                  {icon}
                </IconContext.Provider>
              )}
              <LabelPrimitive.Label
                htmlFor={_id}
                className={labelCva({
                  size,
                })}
              >
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
