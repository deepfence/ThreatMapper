import {
  Combobox as ComboBox,
  ComboboxProps as ComboBoxProps,
  Transition,
} from '@headlessui/react';
import cx from 'classnames';
import { cva } from 'cva';
import { Fragment, useEffect, useState } from 'react';
import { HiOutlineChevronDown } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { twMerge } from 'tailwind-merge';

import { Badge, CircleSpinner } from '@/main';

export type SizeType = 'xs' | 'sm' | 'md';
export type ItemType = {
  name: string;
  value: string;
};
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
        'dark:text-white',
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
// ts-lint disable-next-line
interface ComboboxProps {
  children?: React.ReactNode;
  sizing?: SizeType;
  label?: string;
  value?: any;
  onScroll?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelect?: (item: ItemType) => void;
  multiple?: boolean;
  loading?: boolean;
}
export function Combobox({
  sizing,
  children,
  value,
  label,
  onChange,
  onSelect,
  onScroll,
  loading,
  multiple,
  ...props
}: ComboboxProps) {
  const [intersectionRef, setIntersectionRef] = useState<HTMLSpanElement | null>(null);
  const loadObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        onScroll?.();
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
    <ComboBox {...props} value={value} onChange={onSelect}>
      <div className="relative">
        <ComboBox.Label className={'text-sm font-medium text-gray-900 dark:text-white'}>
          {label}
        </ComboBox.Label>
        <div className="relative">
          <ComboBox.Input
            className={cx(
              'w-full ring-1 rounded-lg ring-gray-300 focus:ring-blue-600',
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
              sizeCva({
                size: sizing,
              }),
            )}
            displayValue={(item: ItemType) => item.name}
            onChange={onChange}
          />
          <ComboBox.Button
            className={twMerge(cx('absolute inset-y-0 right-0 flex items-center pr-2'))}
          >
            {multiple && (
              <Badge
                label={value.length + ''}
                className="pr-8 dark:text-gray-100 dark:bg-gray-600"
              />
            )}

            <SelectArrow sizing={sizing} />
          </ComboBox.Button>
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ComboBox.Options
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
            {loading ? (
              <CircleSpinner />
            ) : (
              <span ref={(ele) => setIntersectionRef(ele)}></span>
            )}
          </ComboBox.Options>
        </Transition>
      </div>
    </ComboBox>
  );
}

export const ComboboxOption = ({
  sizing,
  item,
}: {
  sizing?: SizeType;
  item: ItemType;
}) => {
  return (
    <ComboBox.Option
      className={({ active }) => {
        return twMerge(
          cx(
            'relative select-none py-2 pl-3 pr-3',
            'text-gray-500 dark:text-gray-300 cursor-pointer',
            // text
            'text-gray-500 dark:text-gray-300',
            {
              'bg-gray-100 dark:bg-gray-600': active,
            },
            sizeCva({
              size: sizing,
            }),
          ),
        );
      }}
      value={item}
    >
      {({ selected }) => {
        return (
          <span
            className={twMerge(
              cx('block truncate', {
                'text-blue-600 dark:text-blue-400': selected,
              }),
            )}
          >
            {item?.name}
          </span>
        );
      }}
    </ComboBox.Option>
  );
};
