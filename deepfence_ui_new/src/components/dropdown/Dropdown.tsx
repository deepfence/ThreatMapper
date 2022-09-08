import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import cx from 'classnames';
import React from 'react';
import { twMerge } from 'tailwind-merge';

import { Typography } from '../typography/Typography';

export interface DropdownProps extends DropdownPrimitive.DropdownMenuProps {
  // Trigger passed as children
  children: React.ReactNode;
  // Content that will actually be rendered in the dropdown
  content: React.ReactNode;
  // pass true if you want to merge passed children with default trigger button
  triggerAsChild?: boolean;
  align?: DropdownPrimitive.MenuContentProps['align'];
}

export const Dropdown: React.FC<DropdownProps> = (props) => {
  const { children, content, align = 'start', triggerAsChild, ...rest } = props;
  return (
    <DropdownPrimitive.Root {...rest}>
      <DropdownPrimitive.Trigger asChild={triggerAsChild}>
        {children}
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          sideOffset={4}
          align={align}
          className={cx(
            'radix-side-top:animate-slide-up radix-side-bottom:animate-slide-down',
            'shadow-md bg-white dark:bg-gray-700 py-1 min-w-[195px]',
            'rounded-md',
          )}
        >
          {content}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
};
Dropdown.displayName = 'Dropdown';

export const DropdwonItem: React.ForwardRefExoticComponent<
  DropdownPrimitive.DropdownMenuItemProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef((props, forwardedRef) => {
  const { children, className, ...rest } = props;
  const classes = twMerge(
    cx(
      'flex px-4 py-2 items-center gap-3 text-gray-500 dark:text-gray-300 cursor-pointer',
      'focus:outline-none dark:focus:bg-gray-600 focus:bg-gray-100',
      Typography.size.sm,
      Typography.weight.medium,
    ),
    className,
  );
  return (
    <DropdownPrimitive.Item className={classes} {...rest} ref={forwardedRef}>
      {children}
    </DropdownPrimitive.Item>
  );
});

export const DropdownSeparator: React.ForwardRefExoticComponent<
  DropdownPrimitive.DropdownMenuSeparatorProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef((props, forwardedRef) => {
  const { className, ...rest } = props;
  const classes = twMerge(cx('h-[1px] bg-gray-200 dark:bg-gray-600'), className);
  return <DropdownPrimitive.Separator className={classes} {...rest} ref={forwardedRef} />;
});
