import { autoUpdate, flip, offset, size, useFloating } from '@floating-ui/react-dom';
import {
  Combobox as HUICombobox,
  ComboboxOptionProps as HUIComboboxOptionProps,
  ComboboxProps as HUIComboboxProps,
  Transition,
} from '@headlessui/react';
import {
  createContext,
  ElementType,
  ReactNode,
  RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useIntersection } from 'react-use';
import { twMerge } from 'tailwind-merge';
import { cn } from 'tailwind-preset';

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
const StartIcon = () => {
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
const ClearAllIcon = () => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 23C5.92487 23 1 18.0751 1 12C1 5.92487 5.92487 1 12 1C18.0751 1 23 5.92487 23 12C23 14.9174 21.8411 17.7153 19.7782 19.7782C17.7153 21.8411 14.9174 23 12 23ZM12 2.375C6.68426 2.375 2.375 6.68426 2.375 12C2.375 17.3157 6.68426 21.625 12 21.625C17.3157 21.625 21.625 17.3157 21.625 12C21.625 6.68426 17.3157 2.375 12 2.375ZM13.1069 12L16.4481 8.65875C16.6817 8.38598 16.666 7.97937 16.4121 7.72543C16.1581 7.47148 15.7515 7.45578 15.4788 7.68937L12.1375 10.9963L8.77563 7.63438C8.50285 7.40078 8.09624 7.41648 7.8423 7.67043C7.58836 7.92437 7.57265 8.33098 7.80625 8.60375L11.1613 12L7.875 15.245C7.6788 15.413 7.59334 15.6768 7.65376 15.928C7.71417 16.1791 7.91026 16.3752 8.1614 16.4356C8.41254 16.496 8.67636 16.4106 8.84438 16.2144L12.1238 12.935L15.3825 16.1938C15.6553 16.4273 16.0619 16.4116 16.3158 16.1577C16.5698 15.9038 16.5855 15.4971 16.3519 15.2244L13.1069 12Z"
        fill="currentColor"
      />
    </svg>
  );
};
type ComboboxProps<
  TValue,
  TNullable extends boolean | undefined,
  TMultiple extends boolean | undefined,
  TTag extends ElementType,
> = HUIComboboxProps<TValue, TNullable, TMultiple, TTag> & {
  children?: React.ReactNode;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  label?: string;
  clearAll?: React.ReactNode;
  onClearAll?: () => void;
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
  disabled,
  label,
  clearAll,
  onClearAll,
  value,
  onEndReached,
  loading,
  multiple,
  getDisplayValue,
  onQueryChange,
  startIcon = <StartIcon />,
  endIcon = null,
  ...props
}: ComboboxProps<TValue, boolean | undefined, boolean | undefined, TTag>) {
  const intersectionRef = useRef<RefObject<HTMLElement> | null>(null);
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
            minWidth: '148px',
            maxHeight: `min(${availableHeight}px, 350px)`,
          });
        },
      }),
    ],
  });
  // eslint-disable-next-line
  const intersection = useIntersection(intersectionRef as RefObject<HTMLElement>, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  });

  useEffect(() => {
    if (intersection?.isIntersecting && intersection?.intersectionRatio > 0) {
      onEndReached?.();
    }
  }, [intersection]);

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
        <div className="relative flex flex-col">
          <HUICombobox.Label
            className={cn(
              'text-p3 text-gray-900 dark:text-text-text-and-icon pb-[10px]',
              {
                'text-gray-600 dark:text-gray-600': disabled,
              },
            )}
          >
            {label}
          </HUICombobox.Label>
          <HUICombobox.Button
            ref={(ele) => refs.setReference(ele)}
            className={twMerge(
              cn(
                // display
                'flex items-center gap-1.5 w-fit',
                // border
                'border dark:border-bg-grid-border rounded-[5px]',
                // bg
                'dark:bg-bg-card dark:hover:bg-bg-active-selection',
                'text-p7 dark:text-text-text-and-icon',
                'py-[7px] px-3',
                {
                  'dark:border-bg-hover-3 dark:bg-bg-card dark:text-text-input-value':
                    Array.isArray(value) && value.length,
                },
              ),
            )}
          >
            {startIcon}
            {getDisplayValue?.(value as unknown as any)}
            {endIcon}
            {multiple && Array.isArray(value) && value.length > 0 ? (
              <div className="relative flex items-center">
                <Badge
                  color="blueLight"
                  variant="filled"
                  size="small"
                  label={value?.length}
                />
              </div>
            ) : null}
          </HUICombobox.Button>
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
              <div
                className={cn(
                  'flex items-center dark:bg-bg-card',
                  'border-x border-t dark:border-bg-grid-border',
                  'rounded-x-[5px] rounded-t-[5px]',
                )}
              >
                <span
                  className={cn('pointer-events-none dark:text-text-text-and-icon')}
                  data-testid={`search-icon`}
                >
                  <SearchIcon />
                </span>
                <HUICombobox.Input
                  placeholder="Search"
                  className={cn(
                    'pt-2 pb-1 dark:bg-bg-card shrink',
                    'text-p7 dark:text-text-text-and-icon',
                    'dark:focus-visible:outline-none',
                    'dark:placeholder:text-gray-600',
                  )}
                  onChange={(event) => onQueryChange(event.target.value)}
                />
              </div>

              <Separator />
              <HUICombobox.Options
                className={twMerge(
                  cn(
                    'max-h-60 w-full select-none',
                    'text-p7',
                    // border
                    'border-x dark:border-bg-grid-border',
                    // bg
                    'bg-white dark:bg-bg-card',
                    'overflow-auto',
                    'focus:visible:outline-none',
                    // text
                    'dark:text-text-text-and-icon',
                  ),
                )}
              >
                {children}
                {loading ? (
                  <div className="pt-2 pb-1 px-3 flex items-center">
                    <CircleSpinner size="sm" />
                  </div>
                ) : (
                  <span ref={intersectionRef as RefObject<HTMLElement>}></span>
                )}
              </HUICombobox.Options>
              {multiple ? (
                <>
                  <Separator />
                  <div
                    className={cn(
                      // border
                      'dark:bg-bg-card border-x border-b rounded-b-[5px] dark:border-bg-grid-border',
                      // focus visible
                      'dark:focus-visible:outline-none',
                    )}
                  >
                    <div className="flex items-center justify-center py-[6px]">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onClearAll?.();
                        }}
                        className="flex gap-1.5 dark:text-accent-accent items-center text-p6"
                      >
                        <ClearAllIcon />
                        {clearAll}
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </Transition>
          </Portal>
        </div>
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
          'pt-2 pb-1 px-3',
          'flex gap-1.5',
          'cursor-pointer',
          'dark:hover:bg-bg-grid-header',
          {
            'dark:bg-bg-grid-header': active,
            'dark:bg-bg-active-selection dark:text-text-input-value': selected,
          },
        );
      }}
      {...props}
    >
      {({ selected }) => {
        return (
          <>
            {multiple ? <Checkbox checked={selected} /> : null}
            {children}
          </>
        );
      }}
    </HUICombobox.Option>
  );
}

function Portal(props: { children: ReactNode }) {
  const { children } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
