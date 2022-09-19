import * as LabelPrimitive from '@radix-ui/react-label';
import cx from 'classnames';
import { ComponentProps, forwardRef, useId } from 'react';

import { Typography } from '../typography/Typography';
import HelperText from './HelperText';

export type SizeType = 'sm' | 'md';
export type ColorType = 'default' | 'error' | 'success';
export interface TextInputAreaProps
  extends Omit<ComponentProps<'textarea'>, 'ref' | 'color' | 'className'> {
  label?: string;
  width?: string;
  helperText?: string;
  sizing?: SizeType;
  color?: ColorType;
}

const classes = {
  size: {
    sm: `${Typography.size.sm} p-3`,
    md: `${Typography.size.base} py-3.5 px-4`,
  },
};

const COLOR_DEFAULT = 'default';

export const TextInputArea = forwardRef<HTMLTextAreaElement, TextInputAreaProps>(
  (
    {
      label,
      id,
      sizing = 'sm',
      cols,
      disabled,
      helperText,
      color = COLOR_DEFAULT,
      width = '',
      ...rest
    },
    ref,
  ) => {
    const internalId = useId();
    const _id = id ? id : internalId;

    return (
      <div className={cx('flex flex-col gap-2')}>
        {label && (
          <LabelPrimitive.Root
            htmlFor={_id}
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
            id={_id}
            data-testid={`textinputarea-${_id}`}
            cols={cols}
            ref={ref}
            {...rest}
          />
        </div>
        {helperText && (
          <HelperText
            sizing={sizing}
            color={color}
            text={helperText}
            className="mb-2.5"
          />
        )}
      </div>
    );
  },
);
TextInputArea.displayName = 'TextInputArea';
export default TextInputArea;
