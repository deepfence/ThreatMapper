import './input.css';

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
    'text-p4 px-2 pt-[5px] df-input block w-full disabled:cursor-not-allowed',
    'focus:outline-none',
    'border-b',
    'dark:bg-transparent',
    'transition-[background-size] duration-[0.2s] ease-[ease]',
  ],
  {
    variants: {
      color: {
        default: [
          cn(
            // border
            'dark:border-text-text-and-icon',
            // placeholder styles
            'placeholder-df-gray-500 disabled:placeholder-df-gray-600',
            'dark:placeholder-df-gray-600 dark:disabled:placeholder-df-gray-600',
            // text styles
            'text-gray-900 dark:text-text-input-value',
            // disabled text color
            'disabled:text-gray-700 dark:disabled:text-df-gray-600',
            // focus style
            'dark:bg-[length:0%_100%] dark:focus:bg-[length:100%_100%]',
            'dark:focus:border-b-accent-accent',
            // dark and bg styles
            'dark:bg-no-repeat',
            'dark:focus:bg-no-repeat',
            // 'dark:focus:bg-[linear-gradient(to_bottom,_transparent_95%,_#489CFF_95%)]',
            // 'dark:bg-[linear-gradient(to_bottom,_transparent_95%,_#489CFF_95%)]',
          ),
        ],
        error: [
          cn(
            // border
            'dark:border-chart-red df-error',
            // placeholder styles
            'placeholder-df-gray-500 disabled:placeholder-df-gray-600',
            'dark:placeholder-df-gray-400 dark:disabled:placeholder-df-gray-500',
            // text font
            // text styles
            'text-gray-900 dark:text-text-input-value',
            // disabled text color
            'disabled:text-gray-700 dark:disabled:text-df-gray-600',
            // focus style
            'dark:bg-[length:0%_100%] dark:focus:bg-[length:100%_100%]',
            'dark:focus:border-b-chart-red',
            // dark and bg styles
            'dark:bg-no-repeat',
            'dark:focus:bg-no-repeat',
            // 'dark:focus:bg-[linear-gradient(to_bottom,_transparent_95%,_#F55B47_95%)]',
            // 'dark:bg-[linear-gradient(to_bottom,_transparent_95%,_#F55B47_95%)]',
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
            className="font-medium text-gray-900 dark:text-white"
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
          />
        </div>
        {helperText && <HelperText color={color} text={helperText} className="mb-2.5" />}
      </div>
    );
  },
);
TextInputArea.displayName = 'TextInputArea';
export default TextInputArea;
