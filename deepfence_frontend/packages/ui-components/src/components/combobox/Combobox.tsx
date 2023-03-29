import * as LabelPrimitive from '@radix-ui/react-label';
import cx from 'classnames';
import { useCombobox, useMultipleSelection } from 'downshift';
import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

import { Typography } from '@/components/typography/Typography';

export type SizeType = 'xs' | 'sm' | 'md';
export type ColorType = 'default' | 'error' | 'success';
// export type Option = {
//   value: string | number;
//   label: string;
//   disabled?: boolean;
//   id?: string | number;
// };
type Value = string | string[];
type MutableValue<T extends Value = Value> = T extends string ? string : T;

export interface ComboboxProps<T extends Value = Value> {
  multiSelect?: boolean;
  defaultValue?: T;
  label?: React.ReactNode;
  children: React.ReactNode;
  name?: string;
  value?: MutableValue<T>;
  onChange: (value: MutableValue<T>) => void;
  sizing?: SizeType;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  color?: ColorType;
  helperText?: string;
  placeholder?: string;
  className?: string;
  prefixComponent?: React.ReactNode;
  noPortal?: boolean;
  required?: boolean;
  url?: string;
}

export const classes = {
  color: {
    default: cx(
      'border-gray-300 text-gray-500',
      'focus:border-blue-600 focus:text-gray-900',
      'dark:border-gray-600 dark:text-gray-400',
      'dark:focus:border-blue-800 dark:focus:text-white dark:active:text-white',
    ),
    error: cx('border-red-500 text-red-700', 'focus:border-red-500 focus:text-red-500'),
    success: cx(
      'border-green-500 text-green-700',
      'focus:border-green-500 focus:text-green-500',
    ),
  },
  size: {
    xs: `${Typography.size.sm} p-2`,
    sm: `${Typography.size.sm} p-3`,
    md: `${Typography.size.base} py-3.5 px-4`,
  },
};

const COLOR_DEFAULT = 'default';
const SIZE_DEFAULT = 'sm';
const SelectItemsContext = React.createContext<string | string[]>([]);
export const Combobox: React.FC<ComboboxProps> = ({
  value = [],
  label = null,
  required = false,
  url,
  multiSelect = false,
  onChange,
  sizing = SIZE_DEFAULT,
  color = COLOR_DEFAULT,
  className = '',
  ...props
}) => {
  const [optionsList, setOptionsList] = React.useState<string[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [selectedItems, setSelectedItems] = React.useState(value);
  const items = React.useMemo(() => {
    const lowerCasedInputValue = inputValue.toLowerCase();
    if (!lowerCasedInputValue.length) return optionsList;
    return optionsList.filter(
      (item) =>
        Array.isArray(selectedItems) &&
        !selectedItems.find(
          (selectedItem) => item.toLowerCase() == selectedItem.toLowerCase(),
        ) &&
        item.toLowerCase().includes(lowerCasedInputValue),
    );
  }, [selectedItems, inputValue, optionsList]);
  const selectedItemsList = Array.isArray(selectedItems) ? selectedItems : [];
  const { getSelectedItemProps, getDropdownProps, removeSelectedItem } =
    useMultipleSelection({
      selectedItems: selectedItemsList || [],
      onStateChange({ selectedItems: newSelectedItems, type }) {
        console.log('newSelectedItems', newSelectedItems);

        switch (type) {
          case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownBackspace:
          case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownDelete:
          case useMultipleSelection.stateChangeTypes.DropdownKeyDownBackspace:
          case useMultipleSelection.stateChangeTypes.FunctionRemoveSelectedItem:
            setSelectedItems(newSelectedItems || []);
            onChange(newSelectedItems || []);
            break;
          default:
            break;
        }
      },
    });
  const multpleSelectComboProps = {
    items,
    itemToString(item: string) {
      return item ? item : '';
    },
    defaultHighlightedIndex: 0, // after selection, highlight the first item.
    selectedItem: null,
    stateReducer(state: unknown, actionAndChanges: any) {
      const { changes, type } = actionAndChanges;

      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
          return {
            ...changes,
            isOpen: true, // keep the menu open after selection.
            highlightedIndex: 0, // with the first option highlighted.
          };
        default:
          return changes;
      }
    },
    onStateChange({
      inputValue: newInputValue,
      type,
      selectedItem: newSelectedItem,
    }: {
      inputValue: string;
      type: any;
      selectedItem: string;
    }) {
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
        case useCombobox.stateChangeTypes.InputBlur:
          if (newSelectedItem && Array.isArray(selectedItems)) {
            setSelectedItems([...selectedItems, newSelectedItem]);
            onChange([...selectedItems, newSelectedItem]);
          }
          break;

        case useCombobox.stateChangeTypes.InputChange:
          setInputValue(newInputValue);

          break;
        default:
          break;
      }
    },
  };
  const singleSelectComboProps = {
    onInputValueChange(node: any) {
      onChange(node.selectedItem);
    },
    items,
    itemToString(item: string) {
      return item ? item : '';
    },
  };
  const {
    isOpen,
    getToggleButtonProps,
    getLabelProps,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    selectedItem,
  } = useCombobox(
    multiSelect ? (multpleSelectComboProps as any) : singleSelectComboProps,
  );

  const getOptions = () => {
    if (!url) return;
    // const response = await fetch(url);
    // const data = await response.json();
    const list = ['book10', 'book11', 'book12', 'book13', 'book14', 'book15'];

    if (Array.isArray(list)) {
      setOptionsList((optionsList) => [...optionsList, ...list]);
      console.log('inside', optionsList);
    }
  };
  useEffect(() => {
    (async function loadMoreOptions() {
      await getOptions();
    })();
  }, []);
  const optionsListRef = useRef();
  const onScroll = () => {
    if (optionsListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = optionsListRef.current;
      if (scrollTop + clientHeight === scrollHeight) {
        console.log('Reached bottom');
        getOptions();
      }
    }
  };
  console.log(optionsList);
  const inputProps = multiSelect
    ? { ...getInputProps(getDropdownProps({ preventKeyAction: isOpen })) }
    : { ...getInputProps() };
  console.log('selectedItems98', selectedItems);

  return (
    <SelectItemsContext.Provider value={selectedItems}>
      <div className="w-[592px]">
        <div className="flex flex-col gap-1">
          {label && (
            <LabelPrimitive.Root
              className="text-sm font-medium text-gray-900 dark:text-white w-fit"
              {...getLabelProps()}
            >
              {required && <span>*</span>}
              {label}
            </LabelPrimitive.Root>
          )}

          <div
            className={twMerge(
              cx(
                `${classes.color[color]}`,
                'shadow-sm bg-white inline-flex gap-2 items-center flex-wrap p-1.5',
              ),
            )}
          >
            {multiSelect &&
              Array.isArray(selectedItems) &&
              selectedItems.map(function renderSelectedItem(
                selectedItemForRender,
                index,
              ) {
                return (
                  <span
                    className="bg-gray-100 rounded-md px-1 focus:bg-red-400"
                    key={`selected-item-${index}`}
                    {...getSelectedItemProps({
                      selectedItem: selectedItemForRender,
                      index,
                    })}
                  >
                    {selectedItemForRender}
                    <span
                      className="px-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSelectedItem(selectedItemForRender);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        removeSelectedItem(selectedItemForRender);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      &#10005;
                    </span>
                  </span>
                );
              })}
            <div className="flex gap-0.5 grow">
              <input
                placeholder="Best book ever"
                {...inputProps}
                className={twMerge(
                  cx(
                    'w-full bg-gray-50 dark:bg-gray-700',
                    'block text-left',
                    'focus:outline-none select-none overscroll-contain',
                    `${classes.color[color]}`,
                    `${classes.size[sizing]}`,
                    `${Typography.weight.normal}`,
                    `${Typography.leading.none}`,
                    className,
                  ),
                )}
              />
              <button
                aria-label="toggle menu"
                className="px-2"
                type="button"
                {...getToggleButtonProps()}
              >
                &#8595;
              </button>
            </div>
          </div>
        </div>
        <ul
          className={`absolute w-inherit bg-white mt-1 shadow-md max-h-80 overflow-scroll p-0 ${
            !isOpen && 'hidden'
          }`}
          ref={optionsListRef}
          {...getMenuProps()}
          onScroll={() => onScroll()}
        >
          {/* {isOpen &&
          items.map((item, index) => (
            <li
              className={cx(
                highlightedIndex === index && 'bg-blue-300',
                selectedItem === item && 'font-bold',
                'py-2 px-3 shadow-sm flex flex-col',
              )}
              key={`${item.value}${index}`}
              {...getItemProps({ item, index })}
            >
              <span className="text-sm text-gray-700">{item.label}</span>
            </li>
          ))} */}
          {isOpen &&
            React.Children.map(props.children, (child, index) => {
              if (React.isValidElement(child)) {
                console.log(child.props.value);
                return React.cloneElement(
                  child as React.ReactElement<{
                    value: 'text';
                    key: string;
                  }>,
                  {
                    test: 'test',
                    key: `${child.props.value}${index}`,
                    ...getItemProps({ item: child.props.value, index }),
                  },
                );
              }
            })}
        </ul>
      </div>
    </SelectItemsContext.Provider>
  );
};

export const SelectItem = (props: { value: string; className?: string }) => {
  const selectItemsContext = useContext(SelectItemsContext);
  const isSelected = useMemo(() => {
    if (Array.isArray(selectItemsContext) && props?.value) {
      return selectItemsContext.includes(props.value);
    } else if (selectItemsContext === props?.value) {
      return true;
    }
    return false;
  }, [selectItemsContext, props.value]);

  const classes = twMerge(
    cx(
      'flex px-4 py-2 items-center gap-3 text-gray-500 dark:text-gray-300 cursor-pointer',
      'focus:outline-none dark:focus:bg-gray-600 focus:bg-gray-100',
      'data-active-item:dark:bg-gray-600 data-active-item:bg-gray-100',
      'data-focus-visible:dark:bg-gray-600 data-focus-visible:bg-gray-100',
      Typography.size.sm,
      Typography.weight.medium,
      {
        [`text-blue-600 dark:text-blue-400 ${Typography.weight.semibold}`]: isSelected,
      },
    ),
    props?.className,
  );
  return (
    <li {...props} className={classes} data-testid={`selectitem-${props.value}`}>
      <span className="text-sm text-gray-700">{props.value}</span>
    </li>
  );
};
