import { Label } from '@radix-ui/react-label';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { RadioGroupItemProps, RadioGroupProps } from '@radix-ui/react-radio-group';
import classname from 'classnames';
import { FC, useRef, useState } from 'react';

type ItemProps = RadioGroupItemProps & {
  label: string;
  selected: string;
  onValueChange?: (value: string) => void;
};

type Props = RadioGroupProps & {
  options: { value: string; label: string; disabled?: boolean; id?: string }[];
};
const RadioItem: FC<ItemProps> = (props) => {
  const { value, label, disabled, selected, onValueChange, ...rest } = props;
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex items-center content-center">
      <RadioGroupPrimitive.Item
        value={value}
        key={value}
        data-testid={`radio-item-${value}`}
        disabled={disabled}
        ref={buttonRef}
        className={classname(
          'rounded-full py-2 w-4 h-4',
          'radix-state-checked:bg-blue-600 dark:radix-state-checked:bg-blue-600',
          'radix-state-unchecked:ring-1 bg-gray-50 dark:radix-state-unchecked:ring-1 dark:bg-gray-700',
          'radix-state-unchecked:ring-gray-300 dark:radix-state-unchecked:ring-gray-600',
          'focus:ring-4 ring-blue-200 dark:focus:ring-4 dark:ring-blue-800',
          'radix-state-disabled:pointer-events-none',
          'disabled:cursor-not-allowed',
        )}
        {...rest}
      >
        <RadioGroupPrimitive.Indicator
          className={classname(
            'flex items-center justify-center w-full h-full relative',
            'after:bg-white after:content-[""] dark:after:bg-gray-900',
            'after:block after:w-2 after:h-2 after:rounded-full',
            'radix-state-checked:bg-blue-800',
            'dark:radix-state-unchecked:bg-gray-700',
            'radix-state-disabled:pointer-events-none',
            'disabled:cursor-not-allowed',
          )}
        />
      </RadioGroupPrimitive.Item>
      <Label
        htmlFor={value}
        className={classname('px-2 text-gray-500 text-xs', {
          'cursor-not-allowed': disabled,
          'cursor-pointer': !disabled,
        })}
        onClick={() => {
          // value !== selected is to avoid callback when click the same label again and again
          if (onValueChange && !disabled && value !== selected) {
            buttonRef?.current?.focus();
            onValueChange(value);
          }
        }}
      >
        {label}
      </Label>
    </div>
  );
};

const Radio: FC<Props> = (props) => {
  const { options, name, value, onValueChange, ...rest } = props;
  const [selected, setSelected] = useState('');

  const onChange = (value: string) => {
    setSelected(value);
    onValueChange?.(value);
  };
  return (
    <RadioGroupPrimitive.Root
      onValueChange={onChange}
      data-testid={`radio-group-${name}`}
      value={selected}
      {...rest}
      className="flex flex-col space-y-2"
    >
      {options.map((option) => {
        if (option.value) {
          return (
            <RadioItem
              key={option.value}
              onValueChange={onChange}
              selected={selected}
              {...option}
            />
          );
        }
        return null;
      })}
    </RadioGroupPrimitive.Root>
  );
};

Radio.displayName = 'RadioGroup';

export default Radio;
