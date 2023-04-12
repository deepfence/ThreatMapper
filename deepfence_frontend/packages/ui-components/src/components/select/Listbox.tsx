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

const SIZE_DEFAULT = 'sm';

type IconProps = {
  icon: React.ReactNode;
  name?: string;
  sizing?: SizeType;
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

const SelectArrow = ({ sizing = SIZE_DEFAULT }: Omit<IconProps, 'icon'>) => {
  return (
    <span
      className={cx(
        'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3',
      )}
    >
      <IconContext.Provider
        value={{
          className: cx({
            'w-[16px] h-[16px]': sizing === 'xs',
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
interface ListboxProps<TType, TActualType>
  extends HUIListboxProps<
    React.ExoticComponent<{
      children?: React.ReactNode;
    }>,
    TType,
    TActualType
  > {
  sizing?: SizeType;
  children?: React.ReactNode;
  label?: string;
  placeholder?: string;
  getDisplayValue?: (value: TType) => string;
}
export function Listbox<TType, TActualType>({
  sizing,
  children,
  value,
  label,
  placeholder,
  getDisplayValue,
  ...props
}: ListboxProps<TType, TActualType>) {
  return (
    <HUIListbox {...props} value={value}>
      <div className="relative">
        <HUIListbox.Label className={'text-sm font-medium text-gray-900 dark:text-white'}>
          {label}
        </HUIListbox.Label>
        <HUIListbox.Button
          className={twMerge(
            cx(
              'w-full relative cursor-default rounded-lg bg-white',
              // text
              'text-gray-900 dark:text-white',
              'py-2 pl-3 pr-10 text-left shadow-md',
              // bg
              'bg-gray-50 dark:bg-gray-700',
              // focus
              'focus:outline-none focus-visible:border-blue-500',
              'focus-visible:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700',
              'focus-visible:ring-opacity-75 focus-visible:ring-offset-2',
              'focus-visible:ring-offset-blue-500',
              sizeCva({
                size: sizing,
              }),
            ),
          )}
        >
          <span className="block truncate">
            {getPlaceholderValue(value, getDisplayValue, placeholder)}
          </span>
          <SelectArrow sizing={sizing} />
        </HUIListbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <HUIListbox.Options
            className={twMerge(
              cx(
                'absolute mt-1 max-h-60 w-full shadow-lg select-none',
                // bg
                'bg-gray-50 dark:bg-gray-700',
                'overflow-auto rounded-md py-1',
                'focus:outline-none',
              ),
            )}
          >
            {children}
          </HUIListbox.Options>
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
