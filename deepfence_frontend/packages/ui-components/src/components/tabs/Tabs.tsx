import * as LabelPrimitive from '@radix-ui/react-label';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import cx from 'classnames';
import { cva, VariantProps } from 'cva';
import React from 'react';
import { IconContext } from 'react-icons';

import { Typography } from '@/components/typography/Typography';

export type SizeType = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
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
  variant?: 'primary' | 'secondary';
};

const classes = {
  size: {
    xs: `${Typography.size.xs} ${Typography.weight.medium}`,
    sm: `${Typography.size.sm} ${Typography.weight.medium}`,
    md: `${Typography.size.base} ${Typography.weight.medium}`,
    lg: `${Typography.size.lg} ${Typography.weight.medium}`,
    xl: `${Typography.size.xl} ${Typography.weight.medium}`,
  },
};
const tabListCva = cva(
  [
    'inline-flex gap-x-8 border-b border-gray-200 dark:border-gray-700',
    'text-gray-500 dark:text-gray-400',
    'bg-transparent',
  ],
  {
    variants: {
      withBackgroundSet: {
        true: [
          'border-b-0 dark:bg-gray-800',
          'gap-x-0',
          'w-fit overflow-hidden',
          'text-sm font-medium text-center text-gray-500',
          'divide-x divide-gray-200 rounded-lg shadow',
          'dark:divide-gray-700 dark:text-gray-400',
        ],
      },
    },
  },
);

const tabItemCva = cva(
  [
    'group',
    'outline-none pb-2 px-3',
    'radix-state-active:border-b radix-state-active:-mb-px radix-state-active:text-blue-600 radix-state-active:border-blue-600',
    'dark:radix-state-active:border-blue-500',
    'focus-visible:radix-state-active:ring-4 focus-visible:radix-state-active:ring-blue-200', // TODO: fix me focust ring for secondary variant
    'dark:focus-visible:radix-state-active:ring-blue-800',
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
      withBackgroundSet: {
        true: [
          'radix-state-active:border-b-0 radix-state-active:mb-0 radix-state-active:text-gray-900 dark:radix-state-active:text-white',
          'dark:radix-state-active:border-blue-500',
          'radix-state-active:bg-gray-100 dark:radix-state-active:bg-gray-700',
        ],
      },
    },
    compoundVariants: [
      {
        withBackgroundSet: true,
        size: 'xs',
        className: 'py-2',
      },
      {
        withBackgroundSet: true,
        size: 'sm',
        className: 'py-2.5 px-4',
      },
      {
        withBackgroundSet: true,
        size: 'md',
        className: 'py-3 px-5',
      },
      {
        withBackgroundSet: true,
        size: 'lg',
        className: 'py-3.5 px-6',
      },
      {
        withBackgroundSet: true,
        size: 'xl',
        className: 'py-4 px-7',
      },
    ],
  },
);

const Tabs = (props: TabProps) => {
  const { tabs, value, size = 'sm', children, variant = 'primary', ...rest } = props;
  return (
    <TabsPrimitive.Root {...rest} data-testid={'tabs-testid'} value={value}>
      <TabsPrimitive.List
        className={tabListCva({
          withBackgroundSet: variant === 'secondary',
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
                withBackgroundSet: variant === 'secondary',
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
                className={cx(`${classes.size[size]} cursor-pointer leading-[125%]`)}
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
