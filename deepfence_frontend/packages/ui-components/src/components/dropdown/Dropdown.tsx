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

const CaretIcon = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.90047 13.6175L11.4392 8.26468L5.90047 2.9118C5.58611 2.60898 5.08578 2.61835 4.78297 2.93271C4.48015 3.24708 4.48951 3.7474 4.80387 4.05022L9.16703 8.26468L4.80387 12.4838C4.48951 12.7866 4.48015 13.2869 4.78297 13.6013C5.08578 13.9157 5.58611 13.925 5.90047 13.6222V13.6175Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const DropdownSubMenu: React.FC<
  DropdownPrimitive.DropdownMenuSubProps & {
    children: React.ReactNode;
    content: React.ReactNode;
    triggerAsChild?: boolean;
    disabled?: boolean;
  }
> = ({ children, triggerAsChild, disabled, content }) => {
  const triggerClass = dfTwMerge(
    cx(
      'overflow-hidden flex box-border',
      // paddings
      'px-6 pt-2 pb-1',
      // text
      'text-gray-500 dark:text-text-text-and-icon',
      // hover // focus
      'focus:outline-none focus:bg-gray-100',
      'dark:focus:bg-bg-grid-header dark:focus:text-text-text-and-icon',
      {
        'cursor-pointer': !disabled,
        'cursor-auto dark:text-gray-600': disabled,
      },
    ),
  );

  return (
    <DropdownPrimitive.Sub>
      <DropdownPrimitive.SubTrigger asChild={triggerAsChild} className={triggerClass}>
        <div className="items-center">
          {children}
          <span className="ml-auto -mr-2 w-3 h-3">
            <CaretIcon />
          </span>
        </div>
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
            'data-[side=top]:animate-slide-up data-[side=bottom]:animate-slide-down',
            'shadow-md min-w-[195px]',
            'overflow-hidden',
            // bg
            'bg-white dark:bg-bg-card',
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
  DropdownPrimitive.DropdownMenuItemProps &
    React.RefAttributes<HTMLDivElement> & {
      selected?: boolean;
      icon?: React.ReactNode;
    }
> = React.forwardRef((props, forwardedRef) => {
  const { children, className, disabled, selected, icon, ...rest } = props;
  const classes = dfTwMerge(
    cx(
      'flex gap-x-2',
      // paddings
      'px-6 pt-2 pb-1',
      // text
      'text-gray-500 dark:text-text-text-and-icon',
      // hover // focus
      'focus:outline-none focus:bg-gray-100',
      'dark:focus:bg-bg-grid-header dark:focus:text-text-text-and-icon',
      {
        'cursor-pointer': !disabled,
        'cursor-auto dark:text-gray-600': disabled,
        'dark:bg-bg-active-selection dark:text-text-input-value': selected,
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
      {icon && <div className="w-3 h-3 mr-2">{icon}</div>}

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
