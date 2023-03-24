
import cx from 'classnames';
import React, { useContext, useEffect, useMemo ,useRef} from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { IconContext } from 'react-icons';
import { HiOutlineChevronDown } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';
import {useMultipleSelection,useCombobox} from 'downshift';
import { Typography } from '@/components/typography/Typography';

export type SizeType = 'xs' | 'sm' | 'md';
export type ColorType = 'default' | 'error' | 'success';

type Value = string | string[];
type MutableValue<T extends Value = Value> = T extends string ? string : T;

export interface SelectProps<T extends Value = Value> {
  multiSelect?:boolean;
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
  options: { value: string|number; label: string; disabled?: boolean; id?: string | number }[];
  required?:boolean;
  url?:string;
}

type IconProps = {
  icon: React.ReactNode;
  name?: string;
  color?: ColorType;
  sizing?: SizeType;
};

export const LeftIcon = ({
  icon,
  color = COLOR_DEFAULT,
  sizing = SIZE_DEFAULT,
  name,
}: IconProps) => {
  return (
    <span
      className={cx(
        'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3',
      )}
      data-testid={`ariakit-select-icon-${name}`}
    >
      <IconContext.Provider
        value={{
          className: cx(`${classes.color[color]}`, {
            'w-[18px] h-[18px]': sizing === 'sm',
            'w-[20px] h-[20px]': sizing === 'md',
          }),
        }}
      >
        {icon}
      </IconContext.Provider>
    </span>
  );
};

const SelectArrow = ({
  color = COLOR_DEFAULT,
  sizing = SIZE_DEFAULT,
}: Omit<IconProps, 'icon'>) => {
  return (
    <span
      className={cx(
        'pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3',
        `${classes.color[color]}`,
      )}
    >
      <IconContext.Provider
        value={{
          className: cx(`${classes.color[color]}`, {
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

const SelectStateContext = React.createContext<SelectState | null>(null);


export const MultipleComboBox: React.FC<SelectProps> = ({options=[],value=[],label=null, required=false,url,multiSelect=false,onChange,...props}) => {
  console.log("multiSelect",multiSelect);
  
    const [optionsList, setOptionsList]= React.useState(options);
    const [inputValue, setInputValue] = React.useState('')
    const [selectedItems, setSelectedItems] =
      React.useState(value)
    const items = React.useMemo(
      () => {
        const lowerCasedInputValue = inputValue.toLowerCase();
        if(!lowerCasedInputValue.length) return optionsList;
        return optionsList.filter(item => Array.isArray(selectedItems)&&!selectedItems.find(selectedItem=>item.label.toLowerCase()==selectedItem.label.toLowerCase()) && (item.label.toLowerCase().includes(lowerCasedInputValue) ) )
      },
      [selectedItems, inputValue,optionsList],
    )
    const {getSelectedItemProps, getDropdownProps, removeSelectedItem} =
      useMultipleSelection({
        selectedItems,
        onStateChange({selectedItems: newSelectedItems, type}) {
          switch (type) {
            case useMultipleSelection.stateChangeTypes
              .SelectedItemKeyDownBackspace:
            case useMultipleSelection.stateChangeTypes
              .SelectedItemKeyDownDelete:
            case useMultipleSelection.stateChangeTypes.DropdownKeyDownBackspace:
            case useMultipleSelection.stateChangeTypes
              .FunctionRemoveSelectedItem:
              setSelectedItems(newSelectedItems);
              onChange(newSelectedItems);
              break
            default:
              break
          }
        },
      })
      const multpleSelectComboProps={
        items,
        itemToString(item) {
          return item ? item.label : ''
        },
        defaultHighlightedIndex: 0, // after selection, highlight the first item.
        selectedItem: null,
        stateReducer(state, actionAndChanges) {
          const {changes, type} = actionAndChanges
  
          switch (type) {
            case useCombobox.stateChangeTypes.InputKeyDownEnter:
            case useCombobox.stateChangeTypes.ItemClick:
              return {
                ...changes,
                isOpen: true, // keep the menu open after selection.
                highlightedIndex: 0, // with the first option highlighted.
              }
            default:
              return changes
          }
        },
        onStateChange({
          inputValue: newInputValue,
          type,
          selectedItem: newSelectedItem,
        }) {
          switch (type) {
            case useCombobox.stateChangeTypes.InputKeyDownEnter:
            case useCombobox.stateChangeTypes.ItemClick:
            case useCombobox.stateChangeTypes.InputBlur:
              if (newSelectedItem) {
                setSelectedItems([...selectedItems, newSelectedItem])
                onChange([...selectedItems, newSelectedItem]);
              }
              break
  
            case useCombobox.stateChangeTypes.InputChange:
              setInputValue(newInputValue)
  
              break
            default:
              break
          }
        },
      }
      const singleSelectComboProps={
        onInputValueChange(node) {
          onChange(node.selectedItem)
        },
        items,
        itemToString(item) {
          return item ? item.label : ''
        },
      }
    const {
      isOpen,
      getToggleButtonProps,
      getLabelProps,
      getMenuProps,
      getInputProps,
      highlightedIndex,
      getItemProps,
      selectedItem,
    } = useCombobox(multiSelect?multpleSelectComboProps:singleSelectComboProps)

    const getOptions = ()=>{
      if(!url) return;
      // const response = await fetch(url);
      // const data = await response.json();
      const list = [{value:10,label:"book10"},{value:11,label:"book11"},{value:12,label:"book12"}]

      if(Array.isArray(list)){
        setOptionsList(optionsList=>[...optionsList, ...list])
        console.log("inside",optionsList);
        
      } 
    }
    useEffect(()=>{
      (async function loadMoreOptions() {
        await getOptions();
      })();
    },[])
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
    console.log(optionsList, );
    const inputProps = multiSelect?{...getInputProps(getDropdownProps({preventKeyAction: isOpen}))}: {...getInputProps()}
    return (
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
          
          <div className="shadow-sm bg-white inline-flex gap-2 items-center flex-wrap p-1.5">
            {multiSelect && selectedItems.map(function renderSelectedItem(
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
                  {selectedItemForRender.label}
                  <span
                    className="px-1 cursor-pointer"
                    onClick={e => {
                      e.stopPropagation()
                      removeSelectedItem(selectedItemForRender)
                    }}
                  >
                    &#10005;
                  </span>
                </span>
              )
            })}
            <div className="flex gap-0.5 grow">
              <input
                placeholder="Best book ever"
                className="w-full"
                {...inputProps}
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
            !(isOpen && items.length) && 'hidden'
          }`}
          {...getMenuProps()}
          ref={optionsListRef}
          onScroll={() => onScroll()}
        >
          {isOpen &&
            items.map((item, index) => (
              <li
                className={cx(
                  highlightedIndex === index && 'bg-blue-300',
                  selectedItem === item && 'font-bold',
                  'py-2 px-3 shadow-sm flex flex-col',
                )}
                key={`${item.value}${index}`}
                {...getItemProps({item, index})}
              >
                <span className="text-sm text-gray-700">{item.label}</span>
              </li>
            ))}
        </ul>
      </div>
    )
  }
  