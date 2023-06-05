import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import cx from 'classnames';
import React from 'react';

import { dfTwMerge } from '@/utils/twmerge';

export interface DropdownProps extends DropdownPrimitive.DropdownMenuProps {
  // Trigger passed as children
  children: React.ReactNode;
  // Content that will actually be rendered in the dropdown
  content: React.ReactNode;
  // pass true if you want to merge passed children with default trigger button
  triggerAsChild?: boolean;
  align?: DropdownPrimitive.MenuContentProps['align'];
}

export const DropdownSubMenu: React.FC<
  DropdownPrimitive.DropdownMenuSubProps & {
    children: React.ReactNode;
    content: React.ReactNode;
    triggerAsChild?: boolean;
  }
> = ({ children, content, triggerAsChild }) => {
  return (
    <DropdownPrimitive.Sub>
      <DropdownPrimitive.SubTrigger asChild={triggerAsChild}>
        {children}
      </DropdownPrimitive.SubTrigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.SubContent
          className={cx(
            'shadow-md min-w-[195px]',
            'overflow-hidden',
            // font size
            'text-p7',
            // bg
            'bg-white dark:bg-bg-card',
            // border
            'border dark:border dark:border-bg-left-nav',
          )}
        >
          {content}
        </DropdownPrimitive.SubContent>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Sub>
  );
};

export const Dropdown: React.FC<DropdownProps & { loop?: boolean }> = (props) => {
  const { children, content, align = 'start', triggerAsChild, loop, ...rest } = props;
  return (
    <DropdownPrimitive.Root {...rest}>
      <DropdownPrimitive.Trigger asChild={triggerAsChild}>
        {children}
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          sideOffset={4}
          align={align}
          loop={loop}
          className={cx(
            'radix-side-top:animate-slide-up radix-side-bottom:animate-slide-down',
            'shadow-md bg-white min-w-[195px]',
            'overflow-hidden',
            // bg
            'dark:bg-bg-card',
            // font size
            'text-p7',
            // border
            'border dark:border dark:border-bg-left-nav',
          )}
        >
          {content}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
};
Dropdown.displayName = 'Dropdown';

export const DropdownItem: React.ForwardRefExoticComponent<
  DropdownPrimitive.DropdownMenuItemProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef((props, forwardedRef) => {
  const { children, className, disabled, ...rest } = props;
  const classes = dfTwMerge(
    cx(
      'flex items-center gap-3',
      // disabled
      // paddings
      'px-6 pt-2 pb-1',
      // text
      'text-gray-500 dark:text-text-text-and-icon',
      // hover // focus
      'focus:outline-none focus:bg-gray-100',
      'dark:focus:bg-bg-active-selection dark:focus:text-text-input-value',
      {
        'cursor-pointer': !disabled,
        'cursor-auto dark:text-gray-700': disabled,
      },
    ),
    className,
  );
  return (
    <DropdownPrimitive.Item
      className={classes}
      disabled={disabled}
      {...rest}
      ref={forwardedRef}
    >
      {children}
    </DropdownPrimitive.Item>
  );
});

export const DropdownSeparator: React.ForwardRefExoticComponent<
  DropdownPrimitive.DropdownMenuSeparatorProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef((props, forwardedRef) => {
  const { className, ...rest } = props;
  const classes = dfTwMerge(cx('h-px bg-gray-200 dark:bg-bg-left-nav'), className);
  return <DropdownPrimitive.Separator className={classes} {...rest} ref={forwardedRef} />;
});
