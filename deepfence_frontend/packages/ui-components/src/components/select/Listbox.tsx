import {
  Listbox as HUIListbox,
  ListboxOptionProps as HUIListboxOptionProps,
  ListboxProps as HUIListboxProps,
} from '@headlessui/react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cva } from 'cva';
import { isEmpty, isNil } from 'lodash-es';
import { createContext, useContext, useEffect, useId, useRef } from 'react';
import { useIntersection } from 'react-use';
import { cn } from 'tailwind-preset';

import HelperText from '@/components/input/HelperText';
import { Badge, Checkbox, CircleSpinner, Separator } from '@/main';
export type ColorType = 'default' | 'error';

const ListboxContext = createContext<{
  multiple: boolean;
}>({
  multiple: false,
});
const defaultStyle = cn(
  // border
  'border rounded-[5px]',
  'border-bg-grid-border',
  // bg styles
  'bg-bg-card',
  // text styles
  'dark:text-text-input-value text-text-text-and-icon',
  // disabled text color
  'disabled:text-severity-unknown/60 dark:disabled:text-gray-600/60',
);
const defaultUnderlineStyle = cn(
  'focus-visible:outline-none',
  'border-transparent border-b rounded-none',
  'dark:border-b-text-text-and-icon border-b-bg-border-form dark:disabled:border-b-gray-600/60 disabled:border-b-severity-unknown/60',
  // active
  'transition-[background-size] duration-[0.2s] ease-[ease]',
  'bg-[length:0%_100%] focus:bg-[length:100%_100%]',
  'focus:border-b-accent-accent',
  'bg-[length:0%_100%] bg-no-repeat',
  'bg-gradient-to-b from-transparent from-95% to-accent-accent to-95%',

  'data-[headlessui-state=open]:dark:border-b-accent-accent',
  'data-[headlessui-state=open]:border-b-[#0598f6]',

  // text styles
  'dark:text-text-input-value text-text-text-and-icon',
  // disabled text color
  'disabled:text-severity-unknown/60 dark:disabled:text-gray-600',
);
const defaultUnderlineJErrorStyle = cn(
  'focus-visible:outline-none',
  'border-transparent border-b rounded-none',
  'dark:border-b-text-text-and-icon border-b-bg-border-form <dark:disabled:border-b-gray-600/60></dark:disabled:border-b-gray-600/60> disabled:border-b-severity-unknown',
  // active
  'transition-[background-size] duration-[0.2s] ease-[ease]',
  'bg-[length:0%_100%] focus:bg-[length:100%_100%]',
  'focus:border-b-status-error',
  'bg-[length:0%_100%] bg-no-repeat',
  'bg-gradient-to-b from-transparent from-95% to-chart-red to-95%',

  'data-[headlessui-state=open]:border-b-status-error',

  // text styles
  'dark:text-text-input-value text-text-text-and-icon',
  // disabled text color
  'disabled:text-severity-unknown/60 dark:disabled:text-gray-600',
);
const buttonCva = cva(['relative', 'disabled:cursor-not-allowed', 'py-[5px] px-2'], {
  variants: {
    color: {
      default: [defaultStyle],
      error: '',
    },
    variant: {
      underline: '',
      default: '',
    },
  },
  defaultVariants: {
    color: 'default',
  },
  compoundVariants: [
    {
      variant: 'underline',
      color: 'default',
      className: defaultUnderlineStyle,
    },
    {
      variant: 'underline',
      color: 'error',
      className: cn(
        defaultUnderlineJErrorStyle,
        'data-[headlessui-state=open]:border-b-status-error focus:border-b-status-error border-b-status-error',
      ),
    },
  ],
});
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
    <span className={cn('pointer-events-none flex items-center')}>
      <CaretIcon />
    </span>
  );
};

const OptionsWrapper = ({
  children,
  noDataText,
}: {
  children: React.ReactNode;
  noDataText?: string;
}) => {
  if (children === null || isEmpty(children)) {
    return (
      <div className="py-3 px-2 w-full flex items-center justify-center text-p6 text-text-text-and-icon">
        {noDataText?.length ? noDataText : 'No results found'}
      </div>
    );
  }
  return <>{children}</>;
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
  variant?: 'underline' | 'default';
  children?: React.ReactNode;
  label?: string;
  clearAll?: React.ReactNode;
  onClearAll?: () => void;
  placeholder?: string;
  getDisplayValue?: (value?: TType) => string;
  onEndReached?: () => void;
  startIcon?: React.ReactNode;
  loading?: boolean;
  required?: boolean;
  id?: string;
  helperText?: string;
  noDataText?: string;
}
export function Listbox<TType, TActualType>({
  color,
  variant,
  children,
  value,
  label,
  clearAll,
  onClearAll,
  placeholder,
  getDisplayValue,
  required,
  id,
  helperText,
  disabled,
  multiple,
  onEndReached,
  loading,
  startIcon,
  noDataText,
  ...props
}: ListboxProps<TType, TActualType>) {
  const internalId = useId();
  const _id = id ? id : internalId;
  return (
    <ListboxContext.Provider
      value={{
        multiple: !!multiple,
      }}
    >
      <HUIListbox {...props} value={value} disabled={disabled} multiple={multiple}>
        {({ open }) => {
          return (
            <div className="flex flex-col w-full">
              {label && (
                <HUIListbox.Label
                  htmlFor={_id}
                  className={cn(
                    'text-p11 dark:text-text-input-value text-text-text-and-icon" pb-[10px]',
                    {
                      'text-severity-unknown/60 dark:text-df-gray-600/60': disabled,
                    },
                  )}
                >
                  {required && <span>*</span>}
                  {label}
                </HUIListbox.Label>
              )}

              <PopoverPrimitive.Root open={open}>
                <PopoverPrimitive.Trigger asChild>
                  <HUIListbox.Button
                    id={_id}
                    className={cn(
                      buttonCva({
                        color,
                        variant,
                      }),
                    )}
                  >
                    <div className="flex gap-x-2 items-center">
                      {startIcon ? (
                        <div className="w-4 h-4 shrink-0">{startIcon}</div>
                      ) : null}
                      <span className="truncate text-start block text-p4a">
                        {getPlaceholderValue(value, getDisplayValue, placeholder)}
                      </span>
                    </div>
                    <div
                      className={cn('absolute inset-y-0 right-0 flex pr-3', {
                        'gap-[18px]': multiple,
                      })}
                    >
                      <SelectArrow />
                      {multiple && Array.isArray(value) && value.length > 0 ? (
                        <div className="relative flex items-center">
                          <Badge
                            data-testid="listboxCountBadgeId"
                            color="blueLight"
                            variant="filled"
                            size="small"
                            label={value?.length}
                          />
                        </div>
                      ) : null}
                    </div>
                  </HUIListbox.Button>
                </PopoverPrimitive.Trigger>
                <PopoverPrimitive.Portal>
                  <PopoverPrimitive.Content align="start" sideOffset={2} asChild>
                    <div className="data-[side=top]:animate-slide-up data-[side=bottom]:animate-slide-down w-[var(--radix-popper-anchor-width)] bg-bg-card border border-bg-grid-border rounded-[5px] overflow-hidden shadow-md dark:shadow-none">
                      <HUIListbox.Options>
                        <div
                          className={cn(
                            'max-h-60 w-full select-none',
                            'text-p7',
                            'overflow-auto',
                            'focus:visible:outline-none',
                            // text
                            'text-text-text-and-icon',
                          )}
                        >
                          <OptionsWrapper noDataText={noDataText}>
                            {children}
                          </OptionsWrapper>
                          {loading ? (
                            <div className="pt-2 pb-1 px-2 flex items-center">
                              <CircleSpinner size="sm" />
                            </div>
                          ) : (
                            <InfiniteLoadingObserverElement
                              onVisible={() => {
                                onEndReached?.();
                              }}
                            />
                          )}
                        </div>
                        {multiple ? (
                          <>
                            <Separator />
                            <HUIListbox.Option disabled value="listbox-clearall-option">
                              <div className="flex items-center justify-center py-[6px]">
                                <button
                                  onClick={() => {
                                    onClearAll?.();
                                  }}
                                  className="flex dark:text-accent-accent text-text-link items-center text-p6"
                                >
                                  {clearAll}
                                </button>
                              </div>
                            </HUIListbox.Option>
                          </>
                        ) : null}
                      </HUIListbox.Options>
                    </div>
                  </PopoverPrimitive.Content>
                </PopoverPrimitive.Portal>
              </PopoverPrimitive.Root>
              {helperText && (
                <div className="pt-1.5">
                  <HelperText color={color} text={helperText} />
                </div>
              )}
            </div>
          );
        }}
      </HUIListbox>
    </ListboxContext.Provider>
  );
}

const InfiniteLoadingObserverElement = ({ onVisible }: { onVisible: () => void }) => {
  const intersectionRef = useRef<HTMLDivElement>(null);
  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  });

  useEffect(() => {
    if (intersection?.isIntersecting && intersection?.intersectionRatio > 0) {
      onVisible();
    }
  }, [intersection]);

  return <div ref={intersectionRef}></div>;
};

export function ListboxOption<TType>({
  children,
  ...props
}: HUIListboxOptionProps<'li', TType>) {
  const { multiple } = useContext(ListboxContext);

  return (
    <HUIListbox.Option
      className={({ active, selected }) => {
        return cn(
          'relative select-none',
          'pt-2 pb-1 px-2',
          'flex gap-1.5',
          'cursor-pointer',
          'dark:hover:bg-bg-hover-2 hover:bg-bg-breadcrumb-bar',
          {
            'dark:bg-bg-grid-header bg-bg-breadcrumb-bar': active,
            'dark:bg-bg-active-selection bg-bg-breadcrumb-bar text-text-input-value':
              selected,
          },
          'outline-none focus:outline-none',
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
  if (
    isNil(value) ||
    (typeof value === 'string' && isEmpty(value)) ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return (
      <span
        className={cn(
          'text-severity-unknown/60 disabled:severity-unknown/60',
          'dark:text-df-gray-600 dark:disabled:text-df-gray-600/60',
        )}
      >
        {defaultPlaceholder || 'Select...'}
      </span>
    );
  } else if (getDisplayValue) {
    return getDisplayValue(value);
  }
  return (
    <span
      className={cn(
        'text-severity-unknown/60 disabled:severity-unknown/60',
        'dark:text-df-gray-600 dark:disabled:text-df-gray-600/60',
      )}
    >
      Select...
    </span>
  );
}
