import {
  Combobox as AriaKitCombobox,
  ComboboxItem as AriaKitComboboxItem,
  ComboboxItemProps as AriaKitComboboxItemProps,
  ComboboxList as AriaKitComboboxList,
  ComboboxProps as AriaKitComboboxProps,
  ComboboxProvider as AriaKitComboboxProvider,
  ComboboxProviderProps as AriaKitComboboxProviderProps,
  ComboboxStoreState as AriaKitComboboxStoreState,
  useComboboxContext as useAriaKitComboboxContext,
  useStoreState,
} from '@ariakit/react';
import * as RadixPopover from '@radix-ui/react-popover';
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useIntersection } from 'react-use';
import { cn } from 'tailwind-preset';

import Badge from '@/components/badge/Badge';
import { Checkbox } from '@/components/checkbox/Checkbox';
import HelperText from '@/components/input/HelperText';
import { ErrorIcon } from '@/components/input/TextInput';
import { comboboxInputCva } from '@/components/select-v2/styles';
import Separator from '@/components/separator/Separator';
import { CircleSpinner } from '@/components/spinner/CircleSpinner';

const LocalComboboxContext = createContext<{
  loading?: boolean;
}>({
  loading: false,
});

type ComboboxProviderProps<T extends Value = Value> = AriaKitComboboxProviderProps<T>;

// copied from source
type PickRequired<T, P extends keyof T> = T &
  {
    [K in keyof T]: Pick<Required<T>, K>;
  }[P];

type Value = string | string[];
const ComboboxProvider = <T extends Value = Value>(
  props: PickRequired<
    ComboboxProviderProps<T>,
    'selectedValue' | 'defaultSelectedValue'
  > & {
    loading?: boolean;
    name?: string;
  },
) => {
  const [open, setOpen] = useState(false);

  return (
    <LocalComboboxContext.Provider
      value={{
        loading: !!props.loading,
      }}
    >
      <RadixPopover.Root open={open} onOpenChange={setOpen}>
        <AriaKitComboboxProvider<T>
          {...props}
          resetValueOnHide={props.resetValueOnHide ?? true}
          open={open}
          setOpen={setOpen}
          focusWrap={props.focusWrap ?? false}
          focusLoop={props.focusLoop ?? false}
        >
          {props.children}
          {props.name?.length ? <HiddenInput name={props.name} /> : null}
        </AriaKitComboboxProvider>
      </RadixPopover.Root>
    </LocalComboboxContext.Provider>
  );
};

const HiddenInput = ({ name }: { name: string }) => {
  const store = useAriaKitComboboxContext();

  if (!store) {
    throw new Error('useComboboxContext must be used within a ComboboxProvider');
  }

  const selectedValue = useStoreState(store, 'selectedValue');
  const multiple = Array.isArray(selectedValue);

  if (multiple) {
    return selectedValue.map((value, index) => (
      <input key={value} type="hidden" name={`${name}[${index}]`} value={value} />
    ));
  }
  return <input type="hidden" hidden readOnly name={name} value={selectedValue} />;
};

const Combobox = forwardRef<HTMLInputElement, AriaKitComboboxProps>((props, ref) => {
  return (
    <>
      <div className={cn('flex items-center px-3 py-2')}>
        <span
          className={cn(
            'pointer-events-none text-text-icon dark:text-df-gray-600 h-[16px] w-[16px] shrink-0',
          )}
          data-testid={`search-icon`}
        >
          <SearchIcon />
        </span>
        <AriaKitCombobox
          {...props}
          ref={ref}
          className={cn(
            'pl-[6px] text-p6 dark:text-text-input-value text-text-text-and-icon',
            'focus-visible:outline-none bg-bg-card',
            'placeholder:text-severity-unknown/60 dark:placeholder:text-df-gray-600',
            'min-w-0 w-full',
            props.className,
          )}
        />
      </div>
      <Separator />
    </>
  );
});

const ComboboxTriggerButton = forwardRef<
  HTMLButtonElement,
  RadixPopover.PopoverTriggerProps & {
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
    getDisplayValue?: (
      value: AriaKitComboboxStoreState['selectedValue'],
    ) => React.ReactNode;
  }
>((props, ref) => {
  const { startIcon, getDisplayValue, endIcon, ...radixPopoverProps } = props;

  const store = useAriaKitComboboxContext();

  if (!store) {
    throw new Error('useComboboxContext must be used within a ComboboxProvider');
  }

  const selectedValue = useStoreState(store, 'selectedValue');
  const multiple = Array.isArray(selectedValue);

  return (
    <RadixPopover.Trigger
      {...radixPopoverProps}
      ref={ref}
      className={cn(
        // display
        'flex items-center gap-1.5 w-fit',
        // border
        'border border-bg-grid-border rounded-[5px]',
        // bg
        'bg-bg-card dark:hover:bg-bg-active-selection hover:bg-bg-breadcrumb-bar',
        'text-p7a text-text-text-and-icon',
        'py-[7px] px-3',
        {
          'border-bg-hover-3 dark:bg-bg-active-selection bg-bg-breadcrumb-bar text-text-input-value':
            !!selectedValue.length,
        },
        props.className,
      )}
      data-testid="comboboxTriggerButtonId"
    >
      {startIcon ?? <ButtonStartIcon />}
      {getDisplayValue?.(selectedValue) ?? radixPopoverProps.children}
      {endIcon}
      {multiple && selectedValue.length ? (
        <div className="relative flex items-center">
          <Badge
            color="blue"
            variant="filled"
            size="small"
            label={selectedValue?.length}
          />
        </div>
      ) : null}
    </RadixPopover.Trigger>
  );
});

const ComboboxTriggerInput = forwardRef<
  HTMLButtonElement,
  RadixPopover.PopoverTriggerProps & {
    startIcon?: React.ReactNode;
    getDisplayValue?: (
      value: AriaKitComboboxStoreState['selectedValue'],
    ) => React.ReactNode;
    color?: 'default' | 'error';
    placeholder?: string;
    helperText?: string;
    label?: string;
    disabled?: boolean;
  }
>((props, ref) => {
  const {
    startIcon,
    getDisplayValue,
    color,
    helperText,
    placeholder,
    label,
    disabled,
    ...radixPopoverProps
  } = props;

  const store = useAriaKitComboboxContext();
  const _id = useId();
  const id = props.id ?? _id;

  if (!store) {
    throw new Error('useComboboxContext must be used within a ComboboxProvider');
  }

  const selectedValue = useStoreState(store, 'selectedValue');
  const open = useStoreState(store, 'open');

  return (
    <div className={'relative flex flex-col'}>
      {label?.length ? (
        <label
          htmlFor={id}
          className={cn(
            'text-p11 dark:text-text-input-value text-text-text-and-icon" pb-[10px]',
            {
              'text-severity-unknown/60 dark:text-df-gray-600/60': disabled,
            },
          )}
        >
          {label}
        </label>
      ) : null}
      <div className="flex items-center">
        <RadixPopover.Trigger
          {...radixPopoverProps}
          ref={ref}
          id={id}
          className={cn(
            comboboxInputCva({
              color,
              sizing: 'md',
              isPlaceholder: !selectedValue.length,
              isOpen: open,
            }),
            props.className,
          )}
          data-testid="comboboxTriggerInputButtonId"
        >
          {startIcon ? <div className="w-4 h-4 shrink-0">{startIcon}</div> : null}
          <div
            className={cn('pl-1.5', {
              'text-severity-unknown/60 dark:text-df-gray-600': !selectedValue.length,
            })}
          >
            {getDisplayValue?.(selectedValue) ?? placeholder}
          </div>
          <div className="h-2.5 w-2.5 shrink-0 dark:text-text-text-and-icon text-text-icon ml-auto mr-1.5">
            <CaretDownIcon />
          </div>
        </RadixPopover.Trigger>
        {color === 'error' && (
          <div className={cn('text-chart-red')}>
            <ErrorIcon />
          </div>
        )}
      </div>
      {helperText && (
        <div className="pt-1.5">
          <HelperText color={color} text={helperText} />
        </div>
      )}
    </div>
  );
});

const ComboboxContent = (
  props: RadixPopover.PopoverContentProps & {
    width: 'anchor' | 'fixed';
    clearButtonContent?: React.ReactNode;
    searchPlaceholder?: string;
    onEndReached?: () => void;
  },
) => {
  const { width, clearButtonContent, searchPlaceholder, onEndReached, ...popoverProps } =
    props;
  const store = useAriaKitComboboxContext();
  const { loading } = useContext(LocalComboboxContext);

  if (!store) {
    throw new Error('useComboboxContext must be used within a ComboboxProvider');
  }

  const isMultiple = Array.isArray(store.getState().selectedValue);
  const items = useStoreState(store, 'items');
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        {...popoverProps}
        align="start"
        sideOffset={2}
        className={cn(
          `bg-bg-card border border-bg-grid-border rounded-[5px] overflow-hidden data-[side=top]:animate-slide-up data-[side=bottom]:animate-slide-down shadow-md dark:shadow-none`,
          {
            'w-[var(--radix-popper-anchor-width)]': width === 'anchor',
            'max-w-[250px]': width === 'fixed',
          },
          props.className,
        )}
      >
        <Combobox
          autoSelect
          placeholder={searchPlaceholder}
          data-testid="comboboxSearchInputId"
        />
        <AriaKitComboboxList
          className={cn(
            'max-h-60 w-full select-none',
            'text-p4a',
            'overflow-auto',
            'text-text-text-and-icon',
            props.className,
          )}
        >
          {props.children}
          {!items.length ? (
            <div className="py-3 px-2 w-full flex items-center justify-center text-p6 text-text-text-and-icon">
              No results found
            </div>
          ) : null}
          {loading ? (
            <div className="pt-2 pb-1 px-3 flex items-center justify-center">
              <CircleSpinner size="sm" />
            </div>
          ) : (
            <InfiniteLoadingObserverElement
              onVisible={() => {
                onEndReached?.();
              }}
            />
          )}
        </AriaKitComboboxList>
        {clearButtonContent ? (
          <div className="flex items-center justify-center py-[6px]">
            <button
              className="dark:text-accent-accent text-text-link items-center text-p6"
              onClick={() => {
                store.setSelectedValue(isMultiple ? [] : '');
              }}
            >
              {clearButtonContent}
            </button>
          </div>
        ) : null}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
};

const ComboboxItem = forwardRef<HTMLDivElement, AriaKitComboboxItemProps>(
  (props, ref) => {
    const value = props.value;
    const store = useAriaKitComboboxContext();

    if (!store) {
      throw new Error('useComboboxContext must be used within a ComboboxProvider');
    }

    const isMultiple = useMemo(
      () => Array.isArray(store.getState().selectedValue),
      [store],
    );
    const selectedValue = useStoreState(store, 'selectedValue');
    const selected =
      value && isMultiple ? selectedValue.includes(value) : selectedValue === value;
    return (
      <AriaKitComboboxItem
        {...props}
        ref={ref}
        className={cn(
          'relative select-none',
          'pt-1.5 pb-1.5 px-3',
          'flex gap-1.5',
          'cursor-pointer text-p4a',
          'dark:hover:bg-bg-hover-2 hover:bg-bg-breadcrumb-bar',
          'data-[active-item]:dark:bg-bg-grid-header data-[active-item]:bg-bg-breadcrumb-bar',
          {
            'dark:bg-bg-active-selection bg-bg-breadcrumb-bar text-text-input-value':
              selected,
          },
          props.className,
        )}
        resetValueOnSelect={isMultiple ? false : props.resetValueOnSelect ?? true}
      >
        {isMultiple ? <Checkbox tabIndex={-1} checked={selected} /> : null}
        {props.children}
      </AriaKitComboboxItem>
    );
  },
);

const ButtonStartIcon = () => {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.99996 0.666626C3.05444 0.666626 0.666626 3.05444 0.666626 5.99996C0.666626 8.94548 3.05444 11.3333 5.99996 11.3333C8.94548 11.3333 11.3333 8.94548 11.3333 5.99996C11.3333 4.58547 10.7714 3.22892 9.7712 2.22872C8.771 1.22853 7.41445 0.666626 5.99996 0.666626ZM5.99996 10.6666C3.42263 10.6666 1.33329 8.57729 1.33329 5.99996C1.33329 3.42263 3.42263 1.33329 5.99996 1.33329C8.57729 1.33329 10.6666 3.42263 10.6666 5.99996C10.6666 7.23764 10.175 8.42462 9.29979 9.29979C8.42462 10.175 7.23764 10.6666 5.99996 10.6666ZM6.33329 5.66663H8.72329C8.90739 5.66663 9.05663 5.81586 9.05663 5.99996C9.05663 6.18405 8.90739 6.33329 8.72329 6.33329H6.33329V8.72329C6.33329 8.90739 6.18405 9.05663 5.99996 9.05663C5.81586 9.05663 5.66663 8.90739 5.66663 8.72329V6.33329H3.27663C3.09253 6.33329 2.94329 6.18405 2.94329 5.99996C2.94329 5.81586 3.09253 5.66663 3.27663 5.66663H5.66663V3.27663C5.66663 3.09253 5.81586 2.94329 5.99996 2.94329C6.18405 2.94329 6.33329 3.09253 6.33329 3.27663V5.66663Z"
        fill="currentColor"
      />
    </svg>
  );
};

const SearchIcon = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2 10.5418C2 5.82428 5.82428 2 10.5418 2C15.2593 2 19.0835 5.82428 19.0835 10.5418C19.0835 15.2593 15.2593 19.0835 10.5418 19.0835C5.82428 19.0835 2 15.2593 2 10.5418ZM17.1936 7.78388C18.3093 10.4722 17.6953 13.5679 15.6382 15.6269C13.581 17.686 10.4859 18.3028 7.79653 17.1895C5.10721 16.0763 3.35354 13.4524 3.35354 10.5418C3.3715 6.57822 6.57823 3.36855 10.5418 3.34697C13.4524 3.34431 16.0779 5.09558 17.1936 7.78388ZM22.8091 21.9023L17.9665 17.0269L17.0335 17.9534L21.876 22.8288C22.0415 22.9954 22.2834 23.0612 22.5105 23.0012C22.7376 22.9412 22.9154 22.7646 22.977 22.538C23.0386 22.3113 22.9746 22.069 22.8091 21.9023Z"
        fill="currentColor"
      />
    </svg>
  );
};

const CaretDownIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 12 12"
      height="100%"
      width="100%"
    >
      <path
        fill="currentColor"
        d="M6,9L1.2,4.2a0.68,0.68,0,0,1,1-1L6,7.08,9.84,3.24a0.68,0.68,0,1,1,1,1Z"
      />
    </svg>
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

export {
  Combobox as ComboboxV2,
  ComboboxContent as ComboboxV2Content,
  ComboboxItem as ComboboxV2Item,
  ComboboxProvider as ComboboxV2Provider,
  type ComboboxProviderProps as ComboboxV2ProviderProps,
  ComboboxTriggerButton as ComboboxV2TriggerButton,
  ComboboxTriggerInput as ComboboxV2TriggerInput,
};
