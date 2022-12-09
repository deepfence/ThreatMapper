import * as LabelPrimitive from '@radix-ui/react-label';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import cx from 'classnames';
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

const Tabs = (props: TabProps) => {
  const { tabs, value, defaultValue, size = 'sm', children, ...rest } = props;
  return (
    <TabsPrimitive.Root defaultValue={defaultValue} {...rest} data-testid={'tabs-testid'}>
      <TabsPrimitive.List
        className={cx(
          'inline-flex gap-x-8 border-b bg-white border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 dark:bg-gray-900',
        )}
      >
        {tabs.map(({ label, value, id, icon }) => {
          const _id = id ? id.toString() : value;
          return (
            <TabsPrimitive.Trigger
              key={`tab-trigger-${value}`}
              value={value}
              data-testid={`tab-item-${_id}`}
              className={cx(
                'group',
                'outline-none pb-4 px-3',
                'radix-state-active:border-b radix-state-active:-mb-px radix-state-active:text-blue-600 radix-state-active:border-blue-600',
                'dark:radix-state-active:border-blue-600',
                'focus-visible:radix-state-active:ring-1 focus-visible:radix-state-active:ring-blue-200',
                'dark:focus-visible:radix-state-active:ring-blue-800',
              )}
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
