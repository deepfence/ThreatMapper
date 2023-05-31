import { autoUpdate, flip, offset, size, useFloating } from '@floating-ui/react-dom';
import {
  Listbox as HUIListbox,
  ListboxOptionProps as HUIListboxOptionProps,
  ListboxProps as HUIListboxProps,
  Transition,
} from '@headlessui/react';
import cx from 'classnames';
import { cva } from 'cva';
import { isNil } from 'lodash-es';
import { ReactNode, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiOutlineChevronDown } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { twMerge } from 'tailwind-merge';
export type SizeType = 'sm' | 'md' | 'lg';
export type ColorType = 'default' | 'error' | 'success';
type IconProps = {
  icon: React.ReactNode;
  name?: string;
  sizing?: SizeType;
  color?: ColorType;
};
const optionCva = cva([], {
  variants: {
    size: {
      sm: 'text-xs px-2.5 py-2',
      md: 'text-sm px-2.5 py-2',
      lg: 'text-base px-5 py-2.5',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});
const buttonCva = cva(
  [
    'block w-full ring-1 rounded-lg relative',
    'font-normal',
    'focus:outline-none',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      color: {
        default: [
          'ring-gray-300 focus:ring-blue-600',
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
          // ring styles
          'ring-red-200 focus:ring-red-500',
          'dark:ring-red-800 dark:focus:ring-red-500',
          // bg styles
          'bg-red-50',
          'dark:bg-gray-700',
          // placeholder styles
          'placeholder-red-400 disabled:placeholder-red-300',
          'dark:placeholder-red-700 dark:disabled:placeholder-red-800',
          // text styles
          'text-red-700 disabled:text-red-500',
          'dark:text-red-500 dark:disabled:text-red-700',
        ],
        success: [
          // ring styles
          'ring-green-300 focus:ring-green-500',
          'dark:ring-green-800 dark:focus:ring-green-500',
          // bg styles
          'bg-green-50',
          'dark:bg-gray-700',
          // placeholder styles
          'placeholder-green-400 disabled:placeholder-green-300',
          'dark:placeholder-green-700 dark:disabled:placeholder-green-800',
          // text styles
          'text-green-700 disabled:text-green-500',
          'dark:text-green-500 dark:disabled:text-green-700',
        ],
      },
      size: {
        sm: 'text-sm font-normal px-2.5 py-2 rounded-lg',
        md: 'leading-tight text-sm font-normal p-3 rounded-lg',
        lg: 'text-base font-normal px-4 py-3.5 rounded-lg',
      },
    },
    defaultVariants: {
      color: 'default',
      size: 'md',
    },
  },
);
const SelectArrow = ({ color }: Omit<IconProps, 'icon'>) => {
  return (
    <span
      className={cx(
        'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3',
      )}
    >
      <IconContext.Provider
        value={{
          className: twMerge(
            cx('text-gray-500 dark:text-gray-400 w-[18px] h-[18px]', {
              'text-red-500 dark:text-red-400': color === 'error',
              'text-green-500 dark:text-green-400': color === 'success',
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
  getDisplayValue?: (value?: TType) => string;
  required?: boolean;
  id?: string;
}
export function Listbox<TType, TActualType>({
  sizing,
  color,
  children,
  value,
  label,
  placeholder,
  getDisplayValue,
  required,
  id,
  ...props
}: ListboxProps<TType, TActualType>) {
  const internalId = useId();
  const _id = id ? id : internalId;
  const { x, y, strategy, refs } = useFloating({
    strategy: 'fixed',
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      flip(),
      offset({
        mainAxis: 4,
      }),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            width: `${elements.reference.getBoundingClientRect().width}px`,
            maxHeight: `min(${availableHeight}px, 350px)`,
          });
        },
      }),
    ],
  });
  return (
    <HUIListbox {...props} value={value}>
      <div className="flex flex-col gap-2 w-full">
        <HUIListbox.Label
          htmlFor={_id}
          className={'text-sm font-medium text-gray-900 dark:text-white'}
        >
          {required && <span>*</span>}
          {label}
        </HUIListbox.Label>
        <HUIListbox.Button
          id={_id}
          ref={(ele) => refs.setReference(ele)}
          className={twMerge(
            cx(
              buttonCva({
                size: sizing,
                color,
              }),
            ),
          )}
        >
          <span className="truncate text-start block">
            {getPlaceholderValue(value, getDisplayValue, placeholder)}
          </span>
          <SelectArrow sizing={sizing} color={color} />
        </HUIListbox.Button>
        <Portal>
          <Transition
            as={'div'}
            enter="transition ease-out duration-1200"
            enterFrom="opacity-0 -translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-1200"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 -translate-y-1"
            ref={(ele) => refs.setFloating(ele)}
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0,
            }}
          >
            <HUIListbox.Options
              className={twMerge(
                cx(
                  'shadow-sm bg-white dark:bg-gray-700 w-full',
                  'rounded-md',
                  'border border-gray-200 dark:border-gray-600',
                  'focus:outline-none select-none',
                  'max-h-60 overflow-y-auto',
                ),
              )}
            >
              {children}
            </HUIListbox.Options>
          </Transition>
        </Portal>
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
            optionCva({
              size: sizing,
            }),
          ),
        );
      }}
      {...props}
    />
  );
}
function getPlaceholderValue<T extends unknown | unknown[]>(
  value?: T,
  getDisplayValue?: (value?: T) => string,
  defaultPlaceholder?: string,
) {
  if (isNil(value) || (Array.isArray(value) && !value.length)) {
    return (
      <span className="text-gray-500 dark:text-gray-400 block">
        {defaultPlaceholder ?? 'Select...'}
      </span>
    );
  } else if (getDisplayValue) {
    return getDisplayValue?.(value);
  } else if (Array.isArray(value)) {
    return `${value.length} selected`;
  }
  return '1 item selected';
}

function Portal(props: { children: ReactNode }) {
  const { children } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
