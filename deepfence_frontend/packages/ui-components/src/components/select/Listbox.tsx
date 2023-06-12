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
import { createContext, ReactNode, useContext, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

import HelperText from '@/components/input/HelperText';
import { Badge, Checkbox } from '@/main';
import { dfTwMerge } from '@/utils/twmerge';
export type ColorType = 'default';

const ListboxContext = createContext<{
  multiple: boolean;
}>({
  multiple: false,
});

const buttonCva = cva(
  [
    'relative',
    'focus:outline-none',
    'disabled:cursor-not-allowed',
    'py-[7px] px-3',
    // border radius
    'border rounded-[5px]',
  ],
  {
    variants: {
      color: {
        default: [
          dfTwMerge(
            cx(
              // border
              'dark:border-bg-grid-border',
              // bg styles
              'dark:bg-bg-card',
              // placeholder styles
              'placeholder-gray-500 disabled:placeholder-gray-400',
              'dark:placeholder-gray-400 dark:disabled:placeholder-gray-500',
              // text styles
              'text-gray-900 dark:text-text-input-value',
              // disabled text color
              'disabled:text-gray-700 dark:disabled:text-gray-600',
            ),
          ),
        ],
      },
    },
    defaultVariants: {
      color: 'default',
    },
  },
);
const CaretIcon = () => {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.79996 3.74455L4.99996 7.05566L8.19996 3.74455C8.38099 3.55662 8.37539 3.25752 8.18746 3.0765C7.99953 2.89547 7.70043 2.90107 7.51941 3.089L4.99996 5.69733L2.47774 3.089C2.29671 2.90107 1.99761 2.89547 1.80968 3.0765C1.62175 3.25752 1.61616 3.55662 1.79718 3.74455H1.79996Z"
        fill="black"
      />
      <mask
        id="mask0_10955_28428"
        maskUnits="userSpaceOnUse"
        x="1"
        y="2"
        width="8"
        height="6"
      >
        <path
          d="M1.79996 3.74455L4.99996 7.05566L8.19996 3.74455C8.38099 3.55662 8.37539 3.25752 8.18746 3.0765C7.99953 2.89547 7.70043 2.90107 7.51941 3.089L4.99996 5.69733L2.47774 3.089C2.29671 2.90107 1.99761 2.89547 1.80968 3.0765C1.62175 3.25752 1.61616 3.55662 1.79718 3.74455H1.79996Z"
          fill="white"
        />
      </mask>
      <g mask="url(#mask0_10955_28428)">
        <rect
          x="10"
          y="10"
          width="10"
          height="10"
          transform="rotate(-180 10 10)"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
const SelectArrow = () => {
  return (
    <span className={cx('pointer-events-none flex items-center')}>
      <CaretIcon />
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
  color?: ColorType;
  children?: React.ReactNode;
  label?: string;
  placeholder?: string;
  getDisplayValue?: (value?: TType) => string;
  required?: boolean;
  id?: string;
  helperText?: string;
}
export function Listbox<TType, TActualType>({
  color,
  children,
  value,
  label,
  placeholder,
  getDisplayValue,
  required,
  id,
  helperText,
  disabled,
  multiple,
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
    <ListboxContext.Provider
      value={{
        multiple: !!multiple,
      }}
    >
      <HUIListbox {...props} value={value} disabled={disabled} multiple={multiple}>
        <div className="flex flex-col w-full">
          {label && (
            <HUIListbox.Label
              htmlFor={_id}
              className={cx(
                'text-p3 text-gray-900 dark:text-text-text-and-icon pb-[10px]',
                {
                  'dark:text-gray-600': disabled,
                },
              )}
            >
              {required && <span>*</span>}
              {label}
            </HUIListbox.Label>
          )}

          <HUIListbox.Button
            id={_id}
            ref={(ele) => refs.setReference(ele)}
            className={buttonCva({
              color,
            })}
          >
            <span className="truncate text-start block text-p7">
              {getPlaceholderValue(value, getDisplayValue, placeholder)}
            </span>
            <div
              className={cx('absolute inset-y-0 right-0 flex pr-3', {
                'gap-[18px]': multiple,
              })}
            >
              <SelectArrow />
              {multiple && Array.isArray(value) ? (
                <div className="relative flex items-center">
                  <Badge
                    color="blueLight"
                    variant="filled"
                    size="small"
                    label={value?.length}
                  />
                </div>
              ) : null}
            </div>
          </HUIListbox.Button>
          {helperText && (
            <div className="pt-1.5">
              <HelperText color={color} text={helperText} />
            </div>
          )}
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
                className={dfTwMerge(
                  cx(
                    // bg
                    'bg-white dark:bg-bg-card',
                    'text-p7',
                    // border
                    'border dark:border-bg-grid-border',
                    'rounded-[5px]',
                    'focus:outline-none select-none',
                    'max-h-60 overflow-y-auto',
                    // text
                    'dark:text-text-text-and-icon',
                  ),
                )}
              >
                {children}
              </HUIListbox.Options>
            </Transition>
          </Portal>
        </div>
      </HUIListbox>
    </ListboxContext.Provider>
  );
}

export function ListboxOption<TType>({
  children,
  ...props
}: HUIListboxOptionProps<'li', TType>) {
  const { multiple } = useContext(ListboxContext);

  return (
    <HUIListbox.Option
      className={({ selected }) => {
        return dfTwMerge(
          cx(
            'relative select-none',
            'py-[7px] px-3',
            'flex gap-1.5',
            'cursor-pointer',
            'dark:hover:bg-bg-grid-header',
            {
              'dark:bg-bg-active-selection dark:text-text-input-value': selected,
            },
          ),
        );
      }}
      {...props}
    >
      {({ selected }) => (
        <>
          {multiple ? <Checkbox checked={selected} /> : null}
          {children}
        </>
      )}
    </HUIListbox.Option>
  );
}
function getPlaceholderValue<T extends unknown | unknown[]>(
  value?: T,
  getDisplayValue?: (value?: T) => string,
  defaultPlaceholder?: string,
) {
  if (isNil(value)) {
    return (
      <span className="dark:text-gray-600 block">
        {defaultPlaceholder || 'Select...'}
      </span>
    );
  } else if (getDisplayValue) {
    return getDisplayValue(value);
  }
  return 'Select...';
}

function Portal(props: { children: ReactNode }) {
  const { children } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
