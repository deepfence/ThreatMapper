import * as LabelPrimitive from '@radix-ui/react-label';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, VariantProps } from 'cva';
import React from 'react';
import { cn } from 'tailwind-preset';

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
    disabled?: boolean;
  }[];
  value: string;
  children: React.ReactNode;
  variant?: keyof TabVariantProps;
};

const labelCva = cva(['cursor-pointer uppercase'], {
  variants: {
    disabled: {
      true: 'dark:text-gray-600',
    },
  },
});
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

const tabItemCva = cva(['text-t4 cursor-pointer'], {
  variants: {
    size: {
      md: '',
    },
    underline: {
      true: [
        cn(
          'pb-[9px] pt-[15px] px-3 flex items-center justify-center box-border',
          'data-[state=active]:text-text-input-value data-[state=active]:border-accent-accent',
          // selected
          'dark:data-[state=active]:shadow-[0_-3px_0_#489CFF_inset] transition-shadow duration-[0.2s] ease-[ease-in]',
          // hover
          'dark:hover:shadow-[0_-3px_0_#489CFF_inset] transition-shadow duration-[0.2s] ease-[ease-in]',
          'dark:disabled:hover:shadow-none',
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
        {tabs.map(({ label, value, id, icon, disabled }) => {
          const _id = id ? id.toString() : value;
          return (
            <div key={`tab-trigger-${value}`}>
              <TabsPrimitive.Trigger
                key={`tab-trigger-${value}`}
                value={value}
                data-testid={`tab-item-${_id}`}
                className={tabItemCva({
                  underline: variant === 'underline',
                  size,
                })}
                disabled={disabled}
              >
                <>
                  {icon && <span className="mr-1 inline">{icon}</span>}
                  <LabelPrimitive.Label
                    htmlFor={_id}
                    className={labelCva({
                      disabled,
                    })}
                  >
                    {label}
                  </LabelPrimitive.Label>
                </>
              </TabsPrimitive.Trigger>
            </div>
          );
        })}
      </TabsPrimitive.List>
      <TabsPrimitive.Content value={value}>{children}</TabsPrimitive.Content>
    </TabsPrimitive.Root>
  );
};

export default Tabs;
