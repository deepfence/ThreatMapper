import { Label } from '@radix-ui/react-label';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { RadioGroupProps } from '@radix-ui/react-radio-group';
import cx from 'classnames';
import { FC, useState } from 'react';

type Props = RadioGroupProps & {
  options: { value: string; label: string; disabled?: boolean; id?: string }[];
};

const Radio: FC<Props> = (props) => {
  const { options, name, defaultValue, onValueChange, ...rest } = props;
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
      className="space-y-2"
      {...rest}
    >
      {options.map((option) => {
        if (option.value) {
          const { value, label, disabled, id } = option;
          const _id = id ? id : value;

          return (
            <div key={_id} className="flex items-center">
              <RadioGroupPrimitive.Item
                id={_id}
                value={value}
                data-testid={`radio-item-${_id}`}
                disabled={disabled}
                className={cx(
                  'rounded-full py-2 w-4 h-4',
                  'radix-state-checked:bg-blue-600 dark:radix-state-checked:bg-blue-600',
                  'focus:ring-4 focus:ring-blue-200 dark:focus:ring-4 dark:focus:ring-blue-800',
                  'radix-state-unchecked:bg-gray-50 ring-1 ring-gray-300 dark:radix-state-unchecked:ring-1 dark:ring-gray-600 dark:bg-gray-700',
                  'radix-state-disabled:pointer-events-none',
                  'disabled:cursor-not-allowed',
                )}
              >
                <RadioGroupPrimitive.Indicator
                  className={cx(
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
                htmlFor={_id}
                className={cx('px-2 text-gray-500 text-xs', {
                  'cursor-not-allowed': disabled,
                  'cursor-pointer': !disabled,
                })}
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
