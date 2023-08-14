import { Label } from '@radix-ui/react-label';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { RadioGroupProps } from '@radix-ui/react-radio-group';
import { FC, useState } from 'react';
import { cn } from 'tailwind-preset';

type Direction = 'col' | 'row';
type Props = RadioGroupProps & {
  direction?: Direction;
  options: {
    value: string;
    label: string;
    disabled?: boolean;
    id?: string | number;
    checked?: boolean;
  }[];
};

const isRow = (direction: Direction) => direction === 'row';

const Radio: FC<Props> = (props) => {
  const {
    options,
    name,
    direction = 'col',
    defaultValue,
    onValueChange,
    ...rest
  } = props;
  const [selected, setSelected] = useState(defaultValue);

  const onChange = (value: string) => {
    setSelected(value);
    onValueChange?.(value);
  };

  return (
    <RadioGroupPrimitive.Root
      onValueChange={onChange}
      data-testid={`radio-group-${name}`}
      value={selected}
      className={cn({
        'flex flex-col space-y-2': !isRow(direction),
        'flex flex-row space-x-2': isRow(direction),
      })}
      {...rest}
      name={name}
    >
      {options.map((option) => {
        if (option.value) {
          const { value, label, disabled, id, ...rest } = option;
          const _id = id ? id : value;

          return (
            <div key={_id} className="flex items-center">
              <RadioGroupPrimitive.Item
                id={_id + ''}
                value={value}
                data-testid={`radio-item-${_id}`}
                disabled={disabled}
                className={cn(
                  'rounded-full py-2 w-4 h-4 flex shrink-0 peer group',
                  'data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-accent-accent',
                  'bg-gray-50 ring-inset dark:data-[state=unchecked]:ring-1 dark:data-[state=unchecked]:ring-text-text-and-icon dark:bg-transparent',
                  'data-[state=disabled]:pointer-events-none',
                  // uncheck disabled
                  'dark:data-[state=unchecked]:disabled:bg-gray-600 dark:data-[state=unchecked]:disabled:ring-gray-600',
                  // check disabled
                  'dark:data-[state=checked]:disabled:bg-gray-600 dark:data-[state=checked]:disabled:ring-gray-600',
                  'disabled:cursor-not-allowed',
                )}
                {...rest}
              >
                <RadioGroupPrimitive.Indicator
                  className={cn(
                    'flex items-center justify-center w-full h-full relative shrink-0',
                    'after:bg-white after:content-[""] dark:after:bg-black dark:group-disabled:group-data-[state=checked]:bg-gray-900',
                    'after:block after:w-1 after:h-1 after:rounded-full',
                    'data-[state=disabled]:pointer-events-none',
                  )}
                />
              </RadioGroupPrimitive.Item>
              <Label
                htmlFor={_id + ''}
                className={cn(
                  'pl-1.5 text-p4 dark:text-text-input-value dark:peer-disabled:text-gray-600 peer-disabled:cursor-not-allowed',
                )}
              >
                {label}
              </Label>
            </div>
          );
        }
      })}
    </RadioGroupPrimitive.Root>
  );
};

Radio.displayName = 'Radio';

export default Radio;
