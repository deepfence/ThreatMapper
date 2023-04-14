import {
  Combobox as HUICombobox,
  ComboboxOptionProps as HUIComboboxOptionProps,
  ComboboxProps as HUIComboboxProps,
  Transition,
} from '@headlessui/react';
import cx from 'classnames';
import { cva } from 'cva';
import { ElementType, Fragment, useEffect, useState } from 'react';
import { HiOutlineChevronDown } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { twMerge } from 'tailwind-merge';

import { Badge, CircleSpinner } from '@/main';

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

const inputCva = cva([], {
  variants: {
    color: {
      default: [
        'w-full ring-1 rounded-lg ring-gray-300 focus:ring-blue-600',
        // text
        'text-gray-500 dark:text-gray-400',
        'focus:outline-none',
        'dark:ring-gray-600 dark:focus:ring-blue-600',
        // bg styles
        'bg-gray-50',
        'dark:bg-gray-700',
        // placeholder styles
        'placeholder-gray-500 disabled:placeholder-gray-400',
        'dark:placeholder-gray-400 dark:disabled:placeholder-gray-500',
        // text styles
        'text-gray-900 disabled:text-gray-700',
        'dark:text-white dark:disabled:text-gray-200',
      ],
      error: [
        'w-full relative cursor-default rounded-lg',
        // text
        'text-red-600 placeholder-red-600 dark:text-red-500',
        'py-2 pl-3 pr-10 text-left ring-1',
        // bg
        'bg-red-50 dark:bg-red-100',
        // focus
        'focus:outline-none ring-red-400 dark:ring-red-500  focus-visible:border-red-400 dark:focus-visible:border-red-500',
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
    <span className={cx('pointer-events-none', 'dark:text-white')}>
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

type ComboboxProps<
  TValue,
  TNullable extends boolean | undefined,
  TMultiple extends boolean | undefined,
  TTag extends ElementType,
> = HUIComboboxProps<TValue, TNullable, TMultiple, TTag> & {
  children?: React.ReactNode;
  sizing?: SizeType;
  color?: ColorType;
  label?: string;
  placeholder?: string;
  onEndReached?: () => void;
  loading?: boolean;
  getDisplayValue?: (item: TValue) => string;
  onQueryChange: (query: string) => void;
};

let DEFAULT_COMBOBOX_TAG: React.ExoticComponent<{
  children?: React.ReactNode;
}>;

export function Combobox<TValue, TTag extends ElementType = typeof DEFAULT_COMBOBOX_TAG>(
  props: ComboboxProps<TValue, true, true, TTag>,
): JSX.Element;
export function Combobox<TValue, TTag extends ElementType = typeof DEFAULT_COMBOBOX_TAG>(
  props: ComboboxProps<TValue, true, false, TTag>,
): JSX.Element;
export function Combobox<TValue, TTag extends ElementType = typeof DEFAULT_COMBOBOX_TAG>(
  props: ComboboxProps<TValue, false, false, TTag>,
): JSX.Element;
export function Combobox<TValue, TTag extends ElementType = typeof DEFAULT_COMBOBOX_TAG>(
  props: ComboboxProps<TValue, false, true, TTag>,
): JSX.Element;
export function Combobox<TValue, TTag extends ElementType = typeof DEFAULT_COMBOBOX_TAG>({
  children,
  sizing,
  color,
  label,
  onEndReached,
  loading,
  placeholder,
  getDisplayValue,
  onQueryChange,
  ...props
}: ComboboxProps<TValue, boolean | undefined, boolean | undefined, TTag>) {
  const [intersectionRef, setIntersectionRef] = useState<HTMLSpanElement | null>(null);
  const loadObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        onEndReached?.();
      }
    },
    {
      threshold: 1,
    },
  );

  useEffect(() => {
    if (intersectionRef) {
      loadObserver.observe(intersectionRef);
    }
    return () => {
      if (intersectionRef) {
        loadObserver.unobserve(intersectionRef);
      }
    };
  }, [intersectionRef]);

  return (
    <HUICombobox {...(props as any)}>
      <div className="relative flex flex-col gap-y-1">
        <HUICombobox.Label
          className={cx('text-sm font-medium text-gray-900 dark:text-white', {
            'text-sm': sizing === 'xs',
            'text-base': sizing === 'sm',
            'text-lg': sizing === 'md',
            'text-red-600 placeholder-red-600 dark:text-red-500': color === 'error',
          })}
        >
          {label}
        </HUICombobox.Label>
        <div className="relative">
          <HUICombobox.Input
            placeholder={placeholder || 'Select...'}
            className={twMerge(
              cx(
                sizeCva({
                  size: sizing,
                }),
                inputCva({
                  color,
                }),
              ),
            )}
            defaultValue={props.value}
            displayValue={getDisplayValue as any}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <HUICombobox.Button
            className={twMerge(cx('absolute inset-y-0 right-0 flex items-center pr-2'))}
          >
            {props.multiple && Array.isArray(props.value) && (
              <Badge
                label={`${props.value.length} selected`}
                className={twMerge(
                  cx('pr-8 dark:text-gray-100 dark:bg-gray-600', {
                    'bg-red-300/75 dark:bg-red-500/75': color === 'error',
                  }),
                )}
              />
            )}

            <SelectArrow sizing={sizing} color={color} />
          </HUICombobox.Button>
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="relative">
            <HUICombobox.Options
              className={twMerge(
                cx(
                  'mt-1 max-h-60 w-full shadow-lg select-none',
                  // bg
                  'bg-gray-50 dark:bg-gray-700',
                  'overflow-auto rounded-md py-1',
                  'focus:outline-none',
                ),
              )}
            >
              {children}
              {loading ? (
                <CircleSpinner />
              ) : (
                <span ref={(ele) => setIntersectionRef(ele)}></span>
              )}
            </HUICombobox.Options>
          </div>
        </Transition>
      </div>
    </HUICombobox>
  );
}

interface ComboBoxOptionProps<TType> extends HUIComboboxOptionProps<'li', TType> {
  sizing?: SizeType;
}

export function ComboboxOption<TType>({ sizing, ...props }: ComboBoxOptionProps<TType>) {
  return (
    <HUICombobox.Option
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
