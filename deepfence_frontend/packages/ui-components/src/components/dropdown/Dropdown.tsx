import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import React from 'react';
import { cn } from 'tailwind-preset';

export interface DropdownProps extends DropdownPrimitive.DropdownMenuProps {
  // Trigger passed as children
  children: React.ReactNode;
  // Content that will actually be rendered in the dropdown
  content: React.ReactNode;
  // pass true if you want to merge passed children with default trigger button
  triggerAsChild?: boolean;
  align?: DropdownPrimitive.MenuContentProps['align'];
  disabled?: boolean;
}

const CaretIcon = () => {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.42541 10.2132L8.57947 6.19851L4.42541 2.18385C4.18964 1.95674 3.8144 1.96376 3.58728 2.19953C3.36017 2.43531 3.36719 2.81055 3.60297 3.03766L6.87533 6.19851L3.60297 9.36284C3.36719 9.58995 3.36017 9.96519 3.58728 10.201C3.8144 10.4367 4.18964 10.4438 4.42541 10.2166V10.2132Z"
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
  const triggerClass = cn(
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
  );

  return (
    <DropdownPrimitive.Sub>
      <DropdownPrimitive.SubTrigger asChild={triggerAsChild} className={triggerClass}>
        <div className="items-center">
          {children}
          <span className="ml-auto -mr-2 dark:text-text-text-and-icon">
            <CaretIcon />
          </span>
        </div>
      </DropdownPrimitive.SubTrigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.SubContent
          className={cn(
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
  const {
    children,
    content,
    align = 'start',
    triggerAsChild,
    disabled,
    loop,
    ...rest
  } = props;
  return (
    <DropdownPrimitive.Root {...rest}>
      <DropdownPrimitive.Trigger asChild={triggerAsChild} disabled={disabled}>
        {children}
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          sideOffset={4}
          align={align}
          loop={loop}
          className={cn(
            'data-[side=top]:animate-slide-up data-[side=bottom]:animate-slide-down',
            'shadow-md min-w-[195px]',
            'overflow-hidden',
            // bg
            'bg-white dark:bg-bg-card',
            // font size
            'text-p7',
            // border
            'border dark:border dark:border-bg-left-nav',
            'py-2',
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
  const classes = cn(
    'flex gap-x-2',
    // text
    'text-p4 text-gray-500 dark:text-text-text-and-icon',
    'px-6 pt-2 pb-1', // hover // focus
    'focus:outline-none focus:bg-gray-100',
    'dark:focus:bg-bg-grid-header dark:focus:text-text-text-and-icon',
    {
      'cursor-pointer': !disabled,
      'cursor-auto dark:text-gray-600': disabled,
      'dark:bg-bg-active-selection dark:text-text-input-value': selected,
    },
    className,
  );
  return (
    <DropdownPrimitive.Item
      className={classes}
      disabled={disabled}
      {...rest}
      ref={forwardedRef}
    >
      {icon && <div className="w-4 h-4 mr-2 shrink-0 self-center">{icon}</div>}

      {children}
    </DropdownPrimitive.Item>
  );
});

export const DropdownSeparator: React.ForwardRefExoticComponent<
  DropdownPrimitive.DropdownMenuSeparatorProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef((props, forwardedRef) => {
  const { className, ...rest } = props;
  const classes = cn('h-px bg-gray-200 dark:bg-bg-left-nav flex-1', className);
  return (
    <DropdownPrimitive.Separator
      {...rest}
      ref={forwardedRef}
      className="h-[30px] flex items-center"
    >
      <div className={classes} />
    </DropdownPrimitive.Separator>
  );
});
