import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, VariantProps } from 'cva';
import { isNil } from 'lodash-es';
import { ComponentProps, forwardRef, useId } from 'react';

import HelperText from '@/components/input/HelperText';
import { ObjectWithNonNullableValues } from '@/types/utils';

export interface TextInputAreaProps
  extends Omit<ComponentProps<'textarea'>, 'ref' | 'color' | 'className'>,
    ObjectWithNonNullableValues<
      Omit<VariantProps<typeof inputElementClassnames>, 'isFullWidth'>
    > {
  label?: string;
  helperText?: string;
}

const inputElementClassnames = cva(
  [
    'block ring-1 rounded-lg',
    'font-normal',
    'focus:outline-none',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      color: {
        default: [
          // ring styles
          'ring-gray-300 focus:ring-blue-600',
          'dark:ring-gray-600 dark:focus:ring-blue-600',
          // bg styles
          'bg-gray-50',
          'dark:bg-gray-700',
          // placeholder styles
          'placeholder-gray-500 disabled:placeholder-gray-400',
          'dark:placeholder-gray-400 dark:disabled:placeholder-gray-500',
          // text styles
          'text-gray-900 disabled:text-gray-700',
          'dark:text-white dark:disabled:text-gray-200',
        ],
        error: [
          // ring styles
          'ring-red-200 focus:ring-red-500',
          'dark:ring-red-800 dark:focus:ring-red-500',
          // bg styles
          'bg-red-50',
          'dark:bg-gray-700',
          // placeholder styles
          'placeholder-red-400 disabled:placeholder-red-300',
          'dark:placeholder-red-700 dark:disabled:placeholder-red-800',
          // text styles
          'text-red-700 disabled:text-red-500',
          'dark:text-red-500 dark:disabled:text-red-700',
        ],
      },
      sizing: {
        sm: `text-sm px-4 py-2`,
        md: `text-sm leading-tight px-4 py-3`,
        lg: `text-base px-4 py-3.5`,
      },
      isFullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      color: 'default',
      sizing: 'md',
      isFullWidth: false,
    },
  },
);

const COLOR_DEFAULT = 'default';

export const TextInputArea = forwardRef<HTMLTextAreaElement, TextInputAreaProps>(
  ({ label, id, sizing, cols, helperText, color = COLOR_DEFAULT, ...rest }, ref) => {
    const internalId = useId();
    const _id = id ? id : internalId;

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <LabelPrimitive.Root
            htmlFor={_id}
            className="font-medium text-gray-900 dark:text-white"
          >
            {label}
          </LabelPrimitive.Root>
        )}
        <div>
          <textarea
            className={inputElementClassnames({
              color,
              sizing,
              isFullWidth: isNil(cols),
            })}
            id={_id}
            ref={ref}
            data-testid={`textinputarea-${_id}`}
            cols={cols}
            {...rest}
          />
        </div>
        {helperText && <HelperText color={color} text={helperText} className="mb-2.5" />}
      </div>
    );
  },
);
TextInputArea.displayName = 'TextInputArea';
export default TextInputArea;
