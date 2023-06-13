import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { FC } from 'react';
import { cn } from 'tailwind-preset';

type SeparatorProps = {
  className?: string;
};
const Separator: FC<SeparatorProps> = ({ className = '' }) => (
  <SeparatorPrimitive.Root className={cn('h-px w-full dark:bg-bg-left-nav', className)} />
);

Separator.displayName = 'Separator';

export default Separator;
