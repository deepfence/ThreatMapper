import * as LabelPrimitive from '@radix-ui/react-label';
import cx from 'classnames';
import { ComponentProps, forwardRef, useId } from 'react';

import { Typography } from '../typography/Typography';

export type SizeType = 'sm' | 'md';
export interface TextInputAreaProps
  extends Omit<ComponentProps<'textarea'>, 'ref' | 'color' | 'className'> {
  label?: string;
  width: string;
  helperText?: string;
  sizing?: SizeType;
}

const classes = {
  size: {
    sm: `${Typography.size.sm} p-3`,
    md: `${Typography.size.base} py-3.5 px-4`,
  },
};

export const TextInputArea = forwardRef<HTMLInputElement, TextInputAreaProps>(
  ({ label, id, sizing = 'sm', cols, disabled, width, ...rest }) => {
    const internalId = useId();
    const inputId = id ? id : internalId;

    return (
      <div className={cx('flex flex-col gap-2')}>
        {label && (
          <LabelPrimitive.Root
            htmlFor={inputId}
            className={cx(`${Typography.weight.medium} text-gray-900 dark:text-white`)}
          >
            {label}
          </LabelPrimitive.Root>
        )}
        <div>
          <textarea
            className={cx(
              'border box-border rounded-lg bg-gray-50 dark:bg-gray-700',
              'focus:outline-none',
              'border-gray-200 text-gray-500 focus:text-gray-900 dark:border-gray-600 dark:text-gray-400',
              'focus:border-blue-600 dark:focus:border-blue-800 dark:focus:text-white dark:active:text-white',
              `${Typography.weight.normal}`,
              `${classes.size[sizing]}`,
              {
                'disabled:cursor-not-allowed': disabled,
                'w-full': !width && !cols,
              },
              `${width}`,
            )}
            disabled={disabled}
            id={inputId}
            data-testid={inputId}
            cols={cols}
            {...rest}
          ></textarea>
        </div>
      </div>
    );
  },
);
TextInputArea.displayName = 'TextInputArea';
export default TextInputArea;
