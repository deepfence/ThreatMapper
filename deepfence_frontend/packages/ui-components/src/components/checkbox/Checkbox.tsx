import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as LabelPrimitive from '@radix-ui/react-label';
import cx from 'classnames';
import { isNil } from 'lodash-es';
import React, { useEffect, useId } from 'react';
import { FaCheck, FaMinus } from 'react-icons/fa';

import { Typography } from '@/components/typography/Typography';

export type CheckboxProps = CheckboxPrimitive.CheckboxProps & {
  label?: string;
};

export const Checkbox: React.FC<CheckboxProps> = (props) => {
  const { className, id, label, checked, onCheckedChange, ...rest } = props;

  const [internalChecked, setInternalChecked] =
    React.useState<CheckboxPrimitive.CheckedState>(checked ?? false);

  useEffect(() => {
    if (!isNil(checked)) {
      setInternalChecked(checked);
    }
  }, [checked]);

  const internalId = useId();
  const _id = id ? id : internalId;

  return (
    <div className="flex items-center">
      <CheckboxPrimitive.Root
        id={_id}
        className={cx(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded',
          'focus:outline-none focus:ring-blue-200 focus:ring-2 dark:focus:ring-blue-800',
          'radix-state-unchecked:bg-gray-50 radix-state-unchecked:dark:bg-gray-700 radix-state-unchecked:border border-gray-300 dark:border-gray-600',
          'radix-state-checked:bg-blue-600',
          {
            'bg-blue-600': internalChecked === 'indeterminate',
          },
          'transition-colors',
          className,
        )}
        data-testid={`checkbox-${_id}`}
        checked={checked}
        onCheckedChange={(state) => {
          if (onCheckedChange) {
            onCheckedChange(state);
            return;
          }
          setInternalChecked(state);
        }}
        {...rest}
      >
        <CheckboxPrimitive.Indicator>
          {internalChecked === 'indeterminate' && (
            <FaMinus className="h-2.5 w-2.5 self-center text-white" />
          )}
          {internalChecked === true && (
            <FaCheck className="h-2 w-2 self-center text-white" />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label?.length ? (
        <LabelPrimitive.Label
          htmlFor={_id}
          className={cx(
            Typography.size.sm,
            Typography.weight.medium,
            'ml-2 text-gray-600 dark:text-gray-300 cursor-default',
          )}
        >
          {label}
        </LabelPrimitive.Label>
      ) : null}
    </div>
  );
};

Checkbox.displayName = 'Checkbox';
