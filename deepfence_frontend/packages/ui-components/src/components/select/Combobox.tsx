import {
  Combobox as HUICombobox,
  ComboboxOptionProps as HUIComboboxOptionProps,
  ComboboxProps as HUIComboboxProps,
} from '@headlessui/react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Slot } from '@radix-ui/react-slot';
import { isEmpty } from 'lodash-es';
import React, {
  createContext,
  ElementType,
  useContext,
  useEffect,
  useId,
  useRef,
} from 'react';
import { useIntersection, useUnmount } from 'react-use';
import { cn } from 'tailwind-preset';

import HelperText from '@/components/input/HelperText';
import { ErrorIcon } from '@/components/input/TextInput';
import { comboboxInputCva } from '@/components/select/styles';
import { Badge, Checkbox, CircleSpinner, Separator } from '@/main';

const ListboxContext = createContext<{
  multiple: boolean;
}>({
  multiple: false,
});
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
const OptionsWrapper = ({ children }: { children: React.ReactNode }) => {
  if (children === null || isEmpty(children)) {
    return (
      <div className="py-3 px-2 w-full flex items-center justify-center text-p6 text-text-text-and-icon">
        No results found
      </div>
    );
  }
  return <>{children}</>;
};
type ComboboxProps<
  TValue,
  TNullable extends boolean | undefined,
  TMultiple extends boolean | undefined,
  TTag extends ElementType,
> = HUIComboboxProps<TValue, TNullable, TMultiple, TTag> & {
  triggerVariant?: 'button' | 'select';
  color?: 'error' | 'default';
  helperText?: string;
  children?: React.ReactNode;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  label?: string;
  clearAllElement?: React.ReactNode;
  onClearAll?: () => void;
  placeholder?: string;
  onEndReached?: () => void;
  loading?: boolean;
  getDisplayValue?: (item: TValue) => string | null;
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
  disabled,
  label,
  clearAllElement,
  onClearAll,
  value,
  onEndReached,
  loading,
  multiple,
  getDisplayValue,
  onQueryChange,
  startIcon,
  endIcon = null,
  triggerVariant = 'button',
  placeholder,
  helperText,
  color = 'default',
  ...props
}: ComboboxProps<TValue, boolean | undefined, boolean | undefined, TTag>) {
  const inputBtnId = useId();

  return (
    <ListboxContext.Provider
      value={{
        multiple: !!multiple,
      }}
    >
      <HUICombobox
        {...(props as any)}
        disabled={disabled}
        value={value}
        multiple={multiple}
      >
        {({ open }) => {
          return (
            <div className="relative flex flex-col">
              {label?.length && (
                <HUICombobox.Label
                  htmlFor={inputBtnId}
                  className={cn(
                    'text-p11 dark:text-text-input-value text-text-text-and-icon" pb-[10px]',
                    {
                      'text-severity-unknown/60 dark:text-df-gray-600/60': disabled,
                    },
                  )}
                >
                  {label}
                </HUICombobox.Label>
              )}
              <div className="flex items-center">
                <PopoverPrimitive.Root open={open}>
                  <PopoverPrimitive.Trigger asChild>
                    {triggerVariant === 'button' ? (
                      <HUICombobox.Button
                        id={inputBtnId}
                        data-testid="comboboxTriggerButtonId"
                        as={Slot}
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
                              Array.isArray(value) ? !!value.length : !!value,
                          },
                        )}
                      >
                        <button tabIndex={0}>
                          {startIcon ?? <ButtonStartIcon />}
                          {getDisplayValue?.(value as unknown as any) ?? placeholder}
                          {endIcon}
                          {multiple && Array.isArray(value) && value.length > 0 ? (
                            <div className="relative flex items-center">
                              <Badge
                                color="blue"
                                variant="filled"
                                size="small"
                                label={value?.length}
                              />
                            </div>
                          ) : null}
                        </button>
                      </HUICombobox.Button>
                    ) : (
                      <HUICombobox.Button
                        id={inputBtnId}
                        data-testid="comboboxTriggerButtonId"
                        as={Slot}
                        className={cn(
                          comboboxInputCva({
                            color,
                            sizing: 'md',
                            isPlaceholder: Array.isArray(value) ? !value.length : !value,
                            isOpen: open,
                          }),
                        )}
                      >
                        <button tabIndex={0}>
                          {startIcon ? (
                            <div className="w-4 h-4 shrink-0">{startIcon}</div>
                          ) : null}
                          <div
                            className={cn('pl-1.5', {
                              'text-severity-unknown/60 dark:text-df-gray-600':
                                !getDisplayValue?.(value as unknown as any),
                            })}
                          >
                            {getDisplayValue?.(value as unknown as any) ?? placeholder}
                          </div>
                          <div className="h-2.5 w-2.5 shrink-0 dark:text-text-text-and-icon text-text-icon ml-auto mr-1.5">
                            <CaretDownIcon />
                          </div>
                        </button>
                      </HUICombobox.Button>
                    )}
                  </PopoverPrimitive.Trigger>

                  <PopoverPrimitive.Portal>
                    <PopoverPrimitive.Content asChild align="start" sideOffset={2}>
                      <div
                        className={cn(
                          `bg-bg-card border border-bg-grid-border rounded-[5px] overflow-hidden data-[side=top]:animate-slide-up data-[side=bottom]:animate-slide-down shadow-md dark:shadow-none`,
                          {
                            'w-[var(--radix-popper-anchor-width)]':
                              triggerVariant === 'select',
                            'max-w-[250px]': triggerVariant === 'button',
                          },
                        )}
                      >
                        <div className={cn('flex items-center px-3 py-2')}>
                          <span
                            className={cn(
                              'pointer-events-none text-text-icon dark:text-df-gray-600 h-[16px] w-[16px] shrink-0',
                            )}
                            data-testid={`search-icon`}
                          >
                            <SearchIcon />
                          </span>
                          <HUICombobox.Input
                            placeholder="Search"
                            data-testid="comboboxSearchInputId"
                            className={cn(
                              'pl-[6px] text-p6 dark:text-text-input-value text-text-text-and-icon',
                              'focus-visible:outline-none bg-bg-card',
                              'placeholder:text-severity-unknown/60 dark:placeholder:text-df-gray-600',
                              'min-w-0 w-full',
                            )}
                            onChange={(event) => {
                              onQueryChange(event.target.value);
                            }}
                            displayValue={() => ''}
                          />
                        </div>

                        <Separator />
                        <HUICombobox.Options>
                          <div
                            className={cn(
                              'max-h-60 w-full select-none',
                              'text-p4a',
                              'overflow-auto',
                              'focus:visible:outline-none',
                              'text-text-text-and-icon',
                            )}
                          >
                            <OptionsWrapper>{children}</OptionsWrapper>
                            {loading ? (
                              <div className="pt-2 pb-1 px-3 flex items-center">
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
                              <HUICombobox.Option
                                disabled
                                value="combobox-clearall-option"
                              >
                                <div className="flex items-center justify-center py-[6px]">
                                  <button
                                    className="dark:text-accent-accent text-text-link items-center text-p6"
                                    onClick={() => {
                                      onClearAll?.();
                                    }}
                                  >
                                    {clearAllElement}
                                  </button>
                                </div>
                              </HUICombobox.Option>
                            </>
                          ) : null}
                        </HUICombobox.Options>

                        <UnmountDetectionElement
                          onUnmount={() => {
                            onQueryChange?.('');
                          }}
                        />
                      </div>
                    </PopoverPrimitive.Content>
                  </PopoverPrimitive.Portal>
                </PopoverPrimitive.Root>
                {color === 'error' && triggerVariant === 'select' && (
                  <div
                    className={cn('text-chart-red', {
                      'cursor-not-allowed': disabled,
                    })}
                  >
                    <ErrorIcon />
                  </div>
                )}
              </div>
              {helperText && triggerVariant === 'select' && (
                <div className="pt-1.5">
                  <HelperText color={color} text={helperText} />
                </div>
              )}
            </div>
          );
        }}
      </HUICombobox>
    </ListboxContext.Provider>
  );
}

export function ComboboxOption<TType>({
  children,
  ...props
}: HUIComboboxOptionProps<'li', TType>) {
  const { multiple } = useContext(ListboxContext);
  return (
    <HUICombobox.Option
      className={({ active, selected }) => {
        return cn(
          'relative select-none',
          'pt-1.5 pb-1.5 px-3',
          'flex gap-1.5',
          'cursor-pointer text-p4a',
          'dark:hover:bg-bg-hover-2 hover:bg-bg-breadcrumb-bar',
          {
            'dark:bg-bg-grid-header bg-bg-breadcrumb-bar text-p4a': active,
            'dark:bg-bg-active-selection bg-bg-breadcrumb-bar text-text-input-value text-p4a':
              selected,
          },
        );
      }}
      {...props}
    >
      {({ selected }) => {
        return (
          <>
            {multiple ? <Checkbox tabIndex={-1} checked={selected} /> : null}
            {children}
          </>
        );
      }}
    </HUICombobox.Option>
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

const UnmountDetectionElement = ({ onUnmount }: { onUnmount: () => void }) => {
  useUnmount(() => {
    onUnmount();
  });

  return <React.Fragment />;
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
