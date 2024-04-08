import { cva, VariantProps } from 'cva';
import { FC } from 'react';
import { cn } from 'tailwind-preset';

import { ObjectWithNonNullableValues } from '@/types/utils';

const helperTextClasses = cva('text-p8', {
  variants: {
    color: {
      default: 'text-[#737373] dark:text-text-text-and-icon',
      error: 'text-status-error dark:text-chart-red',
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
  return <p className={cn(helperTextClasses({ color }), className)}>{text}</p>;
};

export default HelperText;
