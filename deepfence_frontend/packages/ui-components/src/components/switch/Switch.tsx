import * as LabelPrimitive from '@radix-ui/react-label';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import cx from 'classnames';
import { useId } from 'react';

import { Typography } from '@/main';

type SizeType = 'sm' | 'md';

export type SwitchProps = SwitchPrimitive.SwitchProps & {
  label?: string;
  size?: SizeType;
};

const Switch = (props: SwitchProps) => {
  const { label, disabled, id, size = 'sm', ...rest } = props;
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
          'relative inline-flex flex-shrink-0 cursor-pointer rounded-[40px] transition-colors duration-200 ease-in-out',
          'focus:outline-none',
          'focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800',
          'disabled:cursor-not-allowed',
          {
            'h-5 w-10': size === 'sm',
            'h-6 w-11': size === 'md',
          },
        )}
        data-testid={`switch-${_id}`}
        {...rest}
      >
        <SwitchPrimitive.Thumb
          className={cx(
            'group-radix-state-checked:translate-x-[1.325rem]',
            'group-radix-state-unchecked:ring-1 ring-blue-200 translate-x-[0.125rem] dark:group-radix-state-unchecked:ring-0',
            'pointer-events-none inline-block transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out',
            'dark:group-radix-state-unchecked:bg-gray-400 dark:group-radix-state-checked: bg-white',
            {
              'h-4 w-4': size === 'sm',
              'h-5 w-5': size === 'md',
            },
          )}
        />
      </SwitchPrimitive.Root>
      {label?.length && (
        <LabelPrimitive.Label
          htmlFor={_id}
          className={cx(
            'pl-2 font-normal text-gray-600 dark:text-gray-300 cursor-default',
            `${Typography.size.sm} ${Typography.weight.medium}`,
            {
              'cursor-not-allowed': disabled,
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
