import { cva, VariantProps } from 'cva';
import { FC } from 'react';
import { twMerge } from 'tailwind-merge';

import { ObjectWithNonNullableValues } from '@/types/utils';

const helperTextClasses = cva('leading-tight text-sm fornt-normal', {
  variants: {
    color: {
      default: 'text-gray-500 dark:text-gray-400',
      error: 'text-red-600 dark:text-red-600',
      success: 'text-green-600 dark:text-green-600',
    },
  },
  defaultVariants: {
    color: 'default',
  },
});

interface Props
  extends ObjectWithNonNullableValues<VariantProps<typeof helperTextClasses>> {
  text: string;
  className?: string;
}

export const HelperText: FC<Props> = ({ text, color, className }) => {
  return <p className={twMerge(helperTextClasses({ color }), className)}>{text}</p>;
};

export default HelperText;
