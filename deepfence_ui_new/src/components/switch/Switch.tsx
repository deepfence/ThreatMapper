import * as LabelPrimitive from '@radix-ui/react-label';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import cx from 'classnames';
import { useId } from 'react';

export type SwitchProps = SwitchPrimitive.SwitchProps & {
  label?: string;
};

const Switch = (props: SwitchProps) => {
  const { label, disabled, id, ...rest } = props;
  const internalId = useId();
  const _id = id ? id : internalId;
  return (
    <div className={cx('flex items-center')}>
      <SwitchPrimitive.Root
        id={_id}
        disabled={disabled}
        className={cx(
          'group items-center',
          'radix-state-checked:bg-blue-600',
          'radix-state-unchecked:bg-gray-200 dark:radix-state-unchecked:bg-gray-600',
          'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-[40px] transition-colors duration-200 ease-in-out',
          'focus:outline-none',
          'focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800',
          'disabled:cursor-not-allowed',
        )}
        data-testid={`switch-${_id}`}
        {...rest}
      >
        <SwitchPrimitive.Thumb
          className={cx(
            'group-radix-state-checked:translate-x-[1.125rem]',
            'group-radix-state-unchecked:ring-1 ring-blue-200 translate-x-[0.125rem] dark:group-radix-state-unchecked:ring-0',
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out',
            'dark:group-radix-state-unchecked:bg-gray-400 dark:group-radix-state-checked: bg-white',
          )}
        />
      </SwitchPrimitive.Root>
      {label?.length && (
        <LabelPrimitive.Label
          htmlFor={_id}
          className={cx(
            'pl-2 text-xs font-normal text-gray-500 dark:text-gray-400 cursor-default',
            {
              'cursor-not-allowed': disabled,
              'cursor-pointer': !disabled,
            },
          )}
        >
          {label}
        </LabelPrimitive.Label>
      )}
    </div>
  );
};

export default Switch;
