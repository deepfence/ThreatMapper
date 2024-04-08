import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, VariantProps } from 'cva';
import { isNil } from 'lodash-es';
import { ComponentProps, forwardRef, useId } from 'react';
import { cn } from 'tailwind-preset';

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
    'text-p4 px-2 pt-[5px] block w-full disabled:cursor-not-allowed',
    'focus:outline-none',
    'border-b',
    'transition-[background-size] duration-[0.2s] ease-[ease]',
  ],
  {
    variants: {
      color: {
        default: [
          cn(
            // border
            'border-bg-border-form dark:disabled:border-text-text-and-icon disabled:border-bg-border-form',
            // placeholder styles
            'placeholder-df-gray-500 disabled:placeholder-severity-unknown/60',
            'dark:placeholder-df-gray-600 dark:disabled:placeholder-df-gray-600',
            // text styles
            'dark:text-text-input-value text-text-text-and-icon',
            // disabled text color
            'disabled:text-severity-unknown/60 dark:disabled:text-df-gray-600',
            // focus style
            'bg-[length:0%_100%] dark:focus:bg-[length:100%_100%]',
            'focus:border-b-accent-accent',
            // dark and bg styles
            'bg-[length:0%_100%] bg-no-repeat',
            'bg-gradient-to-b from-transparent from-95% to-accent-accent to-95%',
            'focus:bg-[length:100%_100%]',
          ),
        ],
        error: [
          cn(
            // border
            'dark:border-chart-red border-status-error dark:disabled:border-text-text-and-icon disabled:border-bg-border-form',
            // placeholder styles
            'placeholder-df-gray-500 disabled:placeholder-severity-unknown/60',
            'dark:placeholder-df-gray-600 dark:disabled:placeholder-df-gray-600',
            // text font
            // text styles
            'dark:text-text-input-value text-text-text-and-icon',
            // disabled text color
            'disabled:text-severity-unknown dark:disabled:text-df-gray-600',
            // focus style
            'bg-[length:0%_100%] focus:bg-[length:100%_100%]',
            'dark:focus:border-b-chart-red focus:border-b-status-error',
            // dark and bg styles
            'bg-[length:0%_100%] bg-no-repeat',
            'bg-gradient-to-b from-transparent from-95% dark:to-chart-red-500 to-status-error to-95%',
            'focus:bg-[length:100%_100%]',
          ),
        ],
      },

      isFullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      color: 'default',
      isFullWidth: false,
    },
  },
);

const COLOR_DEFAULT = 'default';

export const TextInputArea = forwardRef<HTMLTextAreaElement, TextInputAreaProps>(
  ({ label, id, cols, helperText, color = COLOR_DEFAULT, ...rest }, ref) => {
    const internalId = useId();
    const _id = id ? id : internalId;

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <LabelPrimitive.Root
            htmlFor={_id}
            className="font-medium dark:text-text-input-value text-text-text-and-icon"
          >
            {label}
          </LabelPrimitive.Root>
        )}
        <div>
          <textarea
            className={cn(
              inputElementClassnames({
                color,
                isFullWidth: isNil(cols),
              }),
            )}
            id={_id}
            ref={ref}
            data-testid={`textinputarea-${_id}`}
            cols={cols}
            {...rest}
            style={{
              backgroundColor: 'transparent',
            }}
          />
        </div>
        {helperText && <HelperText color={color} text={helperText} className="mb-2.5" />}
      </div>
    );
  },
);
TextInputArea.displayName = 'TextInputArea';
export default TextInputArea;
