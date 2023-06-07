import { Label } from '@radix-ui/react-label';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { RadioGroupProps } from '@radix-ui/react-radio-group';
import cx from 'classnames';
import { FC, useState } from 'react';

type Direction = 'col' | 'row';
type Props = RadioGroupProps & {
  direction?: Direction;
  options: { value: string; label: string; disabled?: boolean; id?: string | number }[];
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
      className={cx({
        'flex flex-col space-y-2': !isRow(direction),
        'flex flex-row space-x-2': isRow(direction),
      })}
      {...rest}
      name={name}
    >
      {options.map((option) => {
        if (option.value) {
          const { value, label, disabled, id } = option;
          const _id = id ? id : value;

          return (
            <div key={_id} className="flex items-center">
              <RadioGroupPrimitive.Item
                id={_id + ''}
                value={value}
                data-testid={`radio-item-${_id}`}
                disabled={disabled}
                className={cx(
                  'rounded-full py-2 w-4 h-4 flex shrink-0',
                  'data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-600',
                  'focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-2 dark:focus:ring-blue-800',
                  'data-[state=unchecked]:ring-2 data-[state=unchecked]:ring-inset ring-gray-300 bg-gray-50 dark:data-[state=unchecked]:ring-1 dark:ring-gray-600 dark:bg-gray-700',
                  'data-[state=disabled]:pointer-events-none',
                  'disabled:cursor-not-allowed',
                )}
              >
                <RadioGroupPrimitive.Indicator
                  className={cx(
                    'flex items-center justify-center w-full h-full relative shrink-0',
                    'after:bg-white after:content-[""] dark:after:bg-white',
                    'after:block after:w-2 after:h-2 after:rounded-full',
                    'data-[state=checked]:bg-blue-800',
                    'dark:data-[state=unchecked]:bg-gray-700',
                    'data-[state=disabled]:pointer-events-none',
                    'disabled:cursor-not-allowed',
                  )}
                />
              </RadioGroupPrimitive.Item>
              <Label
                htmlFor={_id + ''}
                className={cx(
                  'ml-2 text-sm font-medium text-gray-900 dark:text-gray-300',
                  {
                    'cursor-not-allowed': disabled,
                  },
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
