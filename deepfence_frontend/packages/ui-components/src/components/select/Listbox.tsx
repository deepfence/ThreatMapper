import {
  Listbox as HUIListbox,
  ListboxOptionProps as HUIListboxOptionProps,
  ListboxProps as HUIListboxProps,
  Transition,
} from '@headlessui/react';
import cx from 'classnames';
import { cva } from 'cva';
import { Fragment } from 'react';
import { HiOutlineChevronDown } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { twMerge } from 'tailwind-merge';

export type SizeType = 'xs' | 'sm' | 'md';
export type ColorType = 'default' | 'error';
const SIZE_DEFAULT = 'sm';

type IconProps = {
  icon: React.ReactNode;
  name?: string;
  sizing?: SizeType;
  color?: ColorType;
};
const sizeCva = cva([], {
  variants: {
    size: {
      xs: 'text-xs px-3 py-2',
      sm: 'text-sm px-3 py-2',
      md: 'text-base px-5 py-2.5',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});
const buttonColorCva = cva([], {
  variants: {
    color: {
      default: [
        'w-full relative cursor-default rounded-lg bg-white border border-gray-300 dark:border-gray-600',
        // text
        'text-gray-500 dark:text-gray-400',
        'py-2 pl-3 pr-10 text-left',
        // bg
        'bg-gray-50 dark:bg-gray-700',
        // focus
        'focus:outline-none focus-visible:border-blue-500',
        'focus-visible:ring-1 focus:ring-gray-200 dark:focus:ring-gray-700',
        'focus-visible:ring-opacity-75 focus-visible:ring-offset-1',
        'focus-visible:ring-offset-blue-500',
      ],
      error: [
        'w-full relative cursor-default rounded-lg',
        // text
        'text-red-600 placeholder-red-600 dark:text-red-500',
        'py-2 pl-3 pr-10 text-left',
        // bg
        'bg-red-50 dark:bg-red-100',
        // focus
        'focus:outline-none ring-1 ring-red-400 dark:ring-red-500  focus-visible:border-red-400 dark:focus-visible:border-red-500',
        'focus-visible:ring-1 focus:ring-red-400  dark:focus:ring-red-500',
      ],
    },
  },
  defaultVariants: {
    color: 'default',
  },
});

const SelectArrow = ({ sizing = SIZE_DEFAULT, color }: Omit<IconProps, 'icon'>) => {
  return (
    <span
      className={cx(
        'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3',
      )}
    >
      <IconContext.Provider
        value={{
          className: twMerge(
            cx('text-gray-700 dark:text-gray-400', {
              'w-[12px] h-[12px]': sizing === 'xs',
              'w-[14px] h-[14px]': sizing === 'sm',
              'w-[16px] h-[16px]': sizing === 'md',
              'text-red-600 dark:text-red-500': color === 'error',
            }),
          ),
        }}
      >
        <HiOutlineChevronDown />
      </IconContext.Provider>
    </span>
  );
};
interface ListboxProps<TType, TActualType>
  extends HUIListboxProps<
    React.ExoticComponent<{
      children?: React.ReactNode;
    }>,
    TType,
    TActualType
  > {
  sizing?: SizeType;
  color?: ColorType;
  children?: React.ReactNode;
  label?: string;
  placeholder?: string;
  getDisplayValue?: (value: TType) => string;
}
export function Listbox<TType, TActualType>({
  sizing,
  color,
  children,
  value,
  label,
  placeholder,
  getDisplayValue,
  ...props
}: ListboxProps<TType, TActualType>) {
  return (
    <HUIListbox {...props} value={value}>
      <div className="relative flex flex-col gap-y-1">
        <HUIListbox.Label
          className={cx('font-medium text-gray-900 dark:text-white', {
            'text-xs': sizing === 'xs',
            'text-sm': sizing === 'sm',
            'text-md': sizing === 'md',
            'text-red-600 placeholder-red-600 dark:text-red-500': color === 'error',
          })}
        >
          {label}
        </HUIListbox.Label>
        <HUIListbox.Button
          className={twMerge(
            cx(
              sizeCva({
                size: sizing,
              }),
              buttonColorCva({
                color,
              }),
            ),
          )}
        >
          <span className="block truncate">
            {getPlaceholderValue(value, getDisplayValue, placeholder)}
          </span>
          <SelectArrow sizing={sizing} color={color} />
        </HUIListbox.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-1200"
          enterFrom="opacity-0 -translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-1200"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 -translate-y-1"
        >
          <div className="relative">
            <HUIListbox.Options
              className={twMerge(
                cx(
                  'absolute max-h-60 w-full shadow-lg select-none',
                  // bg
                  'bg-gray-50 dark:bg-gray-700',
                  'overflow-auto rounded-md py-1',
                  'focus:outline-none',
                ),
              )}
            >
              {children}
            </HUIListbox.Options>
          </div>
        </Transition>
      </div>
    </HUIListbox>
  );
}

interface ListBoxOptionProps<TType> extends HUIListboxOptionProps<'li', TType> {
  sizing?: SizeType;
}

export function ListboxOption<TType>({ sizing, ...props }: ListBoxOptionProps<TType>) {
  return (
    <HUIListbox.Option
      className={({ active, selected }) => {
        return twMerge(
          cx(
            'relative select-none py-2 pl-3 pr-3',
            'text-gray-500 dark:text-gray-300 cursor-pointer',
            // text
            'text-gray-500 dark:text-gray-300',
            {
              'bg-gray-100 dark:bg-gray-600': active,
              'text-blue-600 dark:text-blue-400': selected,
            },
            sizeCva({
              size: sizing,
            }),
          ),
        );
      }}
      {...props}
    />
  );
}

function getPlaceholderValue<T>(
  value: T | T[] | undefined,
  getDisplayValue?: (value: T) => string,
  defaultPlaceholder?: string,
) {
  if (!value || (Array.isArray(value) && !value.length)) {
    return defaultPlaceholder ?? 'Select...';
  } else if (Array.isArray(value)) {
    return `${value.length} selected`;
  }
  return getDisplayValue?.(value) ?? '1 item selected';
}
