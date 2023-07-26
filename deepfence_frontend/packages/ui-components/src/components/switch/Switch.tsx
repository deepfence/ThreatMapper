import * as LabelPrimitive from '@radix-ui/react-label';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { useId } from 'react';
import { cn } from 'tailwind-preset';

type SizeType = 'md';

export type SwitchProps = SwitchPrimitive.SwitchProps & {
  label?: string;
  size?: SizeType;
};

const Switch = (props: SwitchProps) => {
  const { label, disabled, id, size = 'md', ...rest } = props;
  const internalId = useId();
  const _id = id ? id : internalId;
  return (
    <div className="flex items-center">
      <SwitchPrimitive.Root
        id={_id}
        disabled={disabled}
        className={cn(
          'group peer items-center disabled:cursor-not-allowed',
          'dark:data-[state=checked]:bg-[#60B515]',
          'dark:disabled:data-[state=checked]:bg-gray-600',
          'data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-text-input-value',
          // disabled on off state
          'disabled:ring-inset disabled:data-[state=unchecked]:ring-2 dark:disabled:data-[state=unchecked]:ring-gray-600',
          'dark:disabled:data-[state=unchecked]:bg-transparent',

          'relative inline-flex flex-shrink-0 cursor-pointer rounded-[15px] transition-colors duration-200 ease-in-out',
          'focus:outline-none',
          {
            'h-[18px] w-[34px]': size === 'md',
          },
        )}
        data-testid={`switch-${_id}`}
        {...rest}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'translate-x-[2px] dark:bg-bg-left-nav',
            'pointer-events-none inline-block transform rounded-full',
            'transition duration-200 ease-in-out',
            'group-data-[state=checked]:translate-x-[17px]',
            // disable
            'dark:group-disabled:group-data-[state=unchecked]:ring-2 dark:group-disabled:group-data-[state=unchecked]:ring-gray-600',
            {
              'h-[14px] w-[14px]': size === 'md',
            },
          )}
        />
      </SwitchPrimitive.Root>
      {label?.length && (
        <LabelPrimitive.Label
          htmlFor={_id}
          className={cn(
            'pl-2 text-p4 dark:text-text-text-and-icon cursor-default',
            'dark:peer-disabled:text-gray-600 dark:peer-disabled:cursor-not-allowed',
          )}
        >
          {label}
        </LabelPrimitive.Label>
      )}
    </div>
  );
};

export default Switch;
