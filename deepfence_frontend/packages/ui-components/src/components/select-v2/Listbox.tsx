import {
  Select,
  SelectItem,
  SelectItemProps,
  SelectLabel,
  SelectList,
  SelectProvider,
  SelectProviderProps,
  useSelectContext,
  useStoreState,
} from '@ariakit/react';
import { Label } from '@radix-ui/react-label';
import * as RadixPopover from '@radix-ui/react-popover';
import { cva } from 'cva';
import { isEmpty, isNil } from 'lodash-es';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { useIntersection } from 'react-use';
import { cn } from 'tailwind-preset';

import Badge from '@/components/badge/Badge';
import { Checkbox } from '@/components/checkbox/Checkbox';
import HelperText from '@/components/input/HelperText';
import Separator from '@/components/separator/Separator';
import { CircleSpinner } from '@/components/spinner/CircleSpinner';

type Value = string | string[];
type ComboboxProviderProps<T extends Value = Value> = SelectProviderProps<T>;

export const ListboxV2 = <T extends Value = Value>(
  props: ComboboxProviderProps<T> & {
    label?: string;
    required?: boolean;
    disabled?: boolean;
    color?: 'default' | 'error';
    variant?: 'underline' | 'default';
    startIcon?: React.ReactNode;
    getDisplayValue?: (value: T) => string;
    placeholder?: string;
    clearButtonContent?: React.ReactNode;
    loading?: boolean;
    onEndReached?: () => void;
    helperText?: string;
    name?: string;
  },
) => {
  const {
    label,
    required,
    disabled,
    color,
    variant,
    startIcon,
    getDisplayValue,
    placeholder,
    children,
    clearButtonContent,
    loading,
    onEndReached,
    helperText,
    name,
    ...rest
  } = props;
  const [open, setOpen] = useState(false);

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <SelectProvider {...rest} open={open} setOpen={setOpen}>
        <div className="flex flex-col">
          {label ? (
            <SelectLabel
              render={(props) => {
                return (
                  <Label
                    {...props}
                    className={cn(
                      'text-p11 dark:text-text-input-value text-text-text-and-icon" pb-[10px]',
                      {
                        'text-severity-unknown/60 dark:text-df-gray-600/60': disabled,
                      },
                    )}
                    onClick={() => {
                      setOpen((prev) => !prev);
                    }}
                  >
                    {required && <span>*</span>}
                    {label}
                  </Label>
                );
              }}
            />
          ) : null}

          <ListboxButton
            color={color ?? 'default'}
            variant={variant ?? 'default'}
            getDisplayValue={getDisplayValue}
            placeholder={placeholder}
            startIcon={startIcon}
            name={name}
          />
          <RadixPopover.Portal>
            <RadixPopover.Content
              align="start"
              sideOffset={2}
              className="data-[side=top]:animate-slide-up data-[side=bottom]:animate-slide-down w-[var(--radix-popper-anchor-width)] bg-bg-card border border-bg-grid-border rounded-[5px] shadow-md dark:shadow-none"
            >
              <SelectList
                className={cn(
                  'max-h-60 overflow-auto overscroll-contain',
                  'w-full',
                  'text-p7',
                  'focus:visible:outline-none focus:outline-none',
                  // text
                  'text-text-text-and-icon',
                )}
              >
                {children}
                {loading ? (
                  <div className="pt-2 pb-1 px-2 w-full justify-center flex items-center">
                    <CircleSpinner size="sm" />
                  </div>
                ) : (
                  <InfiniteLoadingObserverElement
                    onVisible={() => {
                      onEndReached?.();
                    }}
                  />
                )}
              </SelectList>
              <ListboxClearButton clearButtonContent={clearButtonContent ?? 'Clear'} />
            </RadixPopover.Content>
          </RadixPopover.Portal>
          {helperText && (
            <div className="pt-1.5">
              <HelperText color={color} text={helperText} />
            </div>
          )}
        </div>
      </SelectProvider>
    </RadixPopover.Root>
  );
};

const ListboxClearButton = ({
  clearButtonContent,
}: {
  clearButtonContent: React.ReactNode;
}) => {
  const store = useSelectContext();

  if (!store) {
    throw new Error('useSelectContext must be used within a SelectProvider');
  }

  const isMultiple = Array.isArray(store.getState().value);

  return isMultiple ? (
    <>
      <Separator />
      <div className="flex items-center justify-center py-[6px]">
        <button
          type="button"
          onClick={() => {
            store.setValue(isMultiple ? [] : '');
          }}
          className="w-full dark:text-accent-accent text-text-link text-center text-p6"
        >
          {clearButtonContent}
        </button>
      </div>
    </>
  ) : null;
};

const ListboxButton = <T extends Value = Value>({
  name,
  color,
  variant,
  startIcon,
  getDisplayValue,
  placeholder,
}: {
  name?: string;
  color: 'default' | 'error';
  variant: 'underline' | 'default';
  startIcon?: React.ReactNode;
  getDisplayValue?: (value: T) => string;
  placeholder?: string;
}) => {
  const store = useSelectContext();

  if (!store) {
    throw new Error('useSelectContext must be used within a SelectProvider');
  }

  const isMultiple = Array.isArray(store.getState().value);
  const value = useStoreState(store, 'value');

  return (
    <div className="flex flex-col w-full">
      <RadixPopover.Trigger asChild>
        <Select
          name={name}
          className={cn(
            buttonCva({
              color,
              variant,
            }),
          )}
        >
          <div className="flex gap-x-2 items-center">
            {startIcon ? <div className="w-4 h-4 shrink-0">{startIcon}</div> : null}
            <span className="truncate text-start block text-p4a">
              {getPlaceholderValue(
                value as T,
                getDisplayValue as (value?: T) => string,
                placeholder,
              )}
            </span>
          </div>
          <div
            className={cn('absolute inset-y-0 right-0 flex pr-3', {
              'gap-[18px]': isMultiple,
            })}
          >
            <SelectArrow />
            {isMultiple && Array.isArray(value) && value.length > 0 ? (
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
        </Select>
      </RadixPopover.Trigger>
    </div>
  );
};

export const ListboxOptionV2 = forwardRef<HTMLDivElement, SelectItemProps>(
  (props, ref) => {
    const store = useSelectContext();

    if (!store) {
      throw new Error('useSelectContext must be used within a SelectProvider');
    }

    const isMultiple = Array.isArray(store.getState().value);
    const value = useStoreState(store, 'value');

    const selected = isMultiple
      ? value.includes(props.value as string)
      : value === props.value;

    return (
      <SelectItem
        {...props}
        ref={ref}
        className={cn(
          'relative select-none',
          'pt-2 pb-1 px-2',
          'flex gap-1.5',
          'cursor-pointer',
          'dark:hover:bg-bg-hover-2 hover:bg-bg-breadcrumb-bar',
          'data-[active-item]:dark:bg-bg-grid-header data-[active-item]:bg-bg-breadcrumb-bar',
          'aria-[selected=true]:dark:!bg-bg-active-selection aria-[selected=true]:!bg-bg-breadcrumb-bar aria-[selected=true]:!text-text-input-value',
          'outline-none focus:outline-none',
        )}
      >
        {isMultiple ? <Checkbox tabIndex={-1} checked={selected} /> : null}
        {props.children}
      </SelectItem>
    );
  },
);

const defaultStyle = cn(
  // border
  'border rounded-[5px]',
  'border-bg-grid-border',
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
  'dark:border-b-text-text-and-icon border-b-bg-border-form dark:disabled:border-b-gray-600/60 disabled:border-b-severity-unknown/60',
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

function getPlaceholderValue<T = Value>(
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
