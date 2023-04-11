import { Listbox as ListBox, Transition } from '@headlessui/react';
import cx from 'classnames';
import { cva } from 'cva';
import { Fragment } from 'react';
import { HiOutlineChevronDown } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { twMerge } from 'tailwind-merge';

export type SizeType = 'xs' | 'sm' | 'md';
export type ItemType = {
  label: string;
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
type SelectProps = {
  sizing?: SizeType;
  children?: React.ReactNode;
  selectedItem?: ItemType;
  onChange?(value: ItemType): void;
};
export function Listbox({ sizing, children, selectedItem, onChange }: SelectProps) {
  return (
    <ListBox value={selectedItem} onChange={onChange}>
      <div className="relative">
        <ListBox.Button
          className={twMerge(
            cx(
              'w-full cursor-default rounded-lg bg-white',
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
          <span className="block truncate">{selectedItem?.label}</span>
          <SelectArrow sizing={sizing} />
        </ListBox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ListBox.Options
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
          </ListBox.Options>
        </Transition>
      </div>
    </ListBox>
  );
}

export const ListboxOption = ({
  sizing,
  item,
}: {
  sizing?: SizeType;
  item: ItemType;
}) => {
  return (
    <ListBox.Option
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
            {item.label}
          </span>
        );
      }}
    </ListBox.Option>
  );
};
