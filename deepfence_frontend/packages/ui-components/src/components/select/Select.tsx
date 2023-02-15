import {
  Select as AriaKitSelect,
  SelectItem as AriakitSelectItem,
  SelectItemProps,
  SelectLabel as AriakitSelectLabel,
  SelectPopover as AriakitSelectPopover,
  SelectState,
  useSelectState,
} from 'ariakit/select';
import cx from 'classnames';
import React, { useContext, useMemo } from 'react';
import { IconContext } from 'react-icons';
import { HiOutlineChevronDown } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';

import { Typography } from '@/components/typography/Typography';

export type SizeType = 'xs' | 'sm' | 'md';
export type ColorType = 'default' | 'error' | 'success';

type Value = string | string[];
type MutableValue<T extends Value = Value> = T extends string ? string : T;

export interface SelectProps<T extends Value = Value> {
  defaultValue?: T;
  label?: React.ReactNode;
  children: React.ReactNode;
  name?: string;
  value?: MutableValue<T>;
  onChange?: (value: MutableValue<T>) => void;
  sizing?: SizeType;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  color?: ColorType;
  helperText?: string;
  placeholder?: string;
  className?: string;
  prefixComponent?: React.ReactNode;
}

type IconProps = {
  icon: React.ReactNode;
  name?: string;
  color?: ColorType;
  sizing?: SizeType;
};

export const LeftIcon = ({
  icon,
  color = COLOR_DEFAULT,
  sizing = SIZE_DEFAULT,
  name,
}: IconProps) => {
  return (
    <span
      className={cx(
        'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3',
      )}
      data-testid={`ariakit-select-icon-${name}`}
    >
      <IconContext.Provider
        value={{
          className: cx(`${classes.color[color]}`, {
            'w-[18px] h-[18px]': sizing === 'sm',
            'w-[20px] h-[20px]': sizing === 'md',
          }),
        }}
      >
        {icon}
      </IconContext.Provider>
    </span>
  );
};

const SelectArrow = ({
  color = COLOR_DEFAULT,
  sizing = SIZE_DEFAULT,
}: Omit<IconProps, 'icon'>) => {
  return (
    <span
      className={cx(
        'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3',
        `${classes.color[color]}`,
      )}
    >
      <IconContext.Provider
        value={{
          className: cx(`${classes.color[color]}`, {
            'w-[18px] h-[18px]': sizing === 'sm',
            'w-[20px] h-[20px]': sizing === 'md',
          }),
        }}
      >
        <HiOutlineChevronDown />
      </IconContext.Provider>
    </span>
  );
};

export const classes = {
  color: {
    default: cx(
      'border-gray-300 text-gray-500',
      'focus:border-blue-600 focus:text-gray-900',
      'dark:border-gray-600 dark:text-gray-400',
      'dark:focus:border-blue-800 dark:focus:text-white dark:active:text-white',
    ),
    error: cx('border-red-500 text-red-700', 'focus:border-red-500 focus:text-red-500'),
    success: cx(
      'border-green-500 text-green-700',
      'focus:border-green-500 focus:text-green-500',
    ),
  },
  size: {
    xs: `${Typography.size.sm} p-2`,
    sm: `${Typography.size.sm} p-3`,
    md: `${Typography.size.base} py-3.5 px-4`,
  },
};

const COLOR_DEFAULT = 'default';
const SIZE_DEFAULT = 'sm';

const SelectStateContext = React.createContext<SelectState | null>(null);

export function Select<T extends Value>({
  defaultValue,
  label,
  children,
  name,
  value,
  onChange,
  sizing = SIZE_DEFAULT,
  color = COLOR_DEFAULT,
  placeholder,
  startIcon,
  className = '',
  prefixComponent = null,
}: SelectProps<T>) {
  const select = useSelectState<T>({
    defaultValue: defaultValue ?? ((Array.isArray(value) ? [] : '') as T),
    sameWidth: true,
    gutter: 8,
    value,
    setValue: (value) => {
      onChange?.(value);
    },
  });

  const placeholderValue = useMemo(() => {
    if (!select?.value?.length) {
      return placeholder ?? '';
    } else if (Array.isArray(select.value)) {
      return `${select.value.length} ${
        select.value.length > 1 ? 'items' : 'item'
      } selected`;
    }
    return select.value;
  }, [select.value, placeholder]);

  return (
    <SelectStateContext.Provider value={select}>
      <div className={`flex flex-col gap-1`}>
        <AriakitSelectLabel
          state={select}
          className={cx(`${Typography.weight.medium} text-gray-900 dark:text-white`, {
            [Typography.size.sm]: sizing === 'xs',
          })}
          data-testid={`ariakit-label-${name}`}
        >
          {label}
        </AriakitSelectLabel>
        <div
          className={cx(`${classes.color[color]}`, {
            ['flex border box-border rounded-lg overflow-hidden']:
              prefixComponent !== null,
          })}
        >
          {prefixComponent !== null ? (
            <div className={`flex items-center px-3 border-r ${classes.color[color]}`}>
              {prefixComponent}
            </div>
          ) : null}
          <div className="relative w-full">
            <AriaKitSelect
              state={select}
              name={name}
              className={twMerge(
                cx(
                  'w-full bg-gray-50 dark:bg-gray-700',
                  'block text-left relative',
                  'focus:outline-none select-none overscroll-contain',
                  `${classes.color[color]}`,
                  `${classes.size[sizing]}`,
                  `${Typography.weight.normal}`,
                  `${Typography.leading.none}`,
                  {
                    'pl-[38px]': startIcon,
                    ['border box-border rounded-lg']: prefixComponent === null,
                  },
                  className,
                ),
              )}
              data-testid={`ariakit-select-${name}`}
            >
              {placeholderValue}
              <SelectArrow sizing={sizing} color={color} />
            </AriaKitSelect>
            {startIcon && (
              <LeftIcon icon={startIcon} sizing={sizing} color={color} name={name} />
            )}
          </div>
        </div>
        <AriakitSelectPopover
          portal
          state={select}
          className={cx(
            'shadow-sm bg-white dark:bg-gray-700 py-1',
            'rounded-md',
            'border border-gray-200 dark:border-gray-600',
            'focus:outline-none select-none',
            'max-h-[min(var(--popover-available-height,315px),315px)] overflow-y-auto',
            'animate-slide-down',
          )}
          data-testid={`ariakit-portal-${name}`}
        >
          {defaultValue === '' ? <AriakitSelectItem value="" /> : null}
          {children}
        </AriakitSelectPopover>
      </div>
    </SelectStateContext.Provider>
  );
}

export const SelectItem = (props: SelectItemProps<'div'>) => {
  const selectStateContext = useContext(SelectStateContext);
  const isSelected = useMemo(() => {
    if (Array.isArray(selectStateContext?.value) && props?.value) {
      return selectStateContext?.value.includes(props.value);
    } else if (selectStateContext?.value === props?.value) {
      return true;
    }
    return false;
  }, [selectStateContext?.value, props.value]);

  const classes = twMerge(
    cx(
      'flex px-4 py-2 items-center gap-3 text-gray-500 dark:text-gray-300 cursor-pointer',
      'focus:outline-none dark:focus:bg-gray-600 focus:bg-gray-100',
      'data-active-item:dark:bg-gray-600 data-active-item:bg-gray-100',
      'data-focus-visible:dark:bg-gray-600 data-focus-visible:bg-gray-100',
      Typography.size.sm,
      Typography.weight.medium,
      {
        [`text-blue-600 dark:text-blue-400 ${Typography.weight.semibold}`]: isSelected,
      },
    ),
    props?.className,
  );
  return (
    <AriakitSelectItem
      {...props}
      className={classes}
      data-testid={`ariakit-selectitem-${props.value}`}
    />
  );
};
