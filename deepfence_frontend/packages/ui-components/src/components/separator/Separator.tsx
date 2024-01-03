import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { FC } from 'react';
import { cn } from 'tailwind-preset';

interface ISeparatorProps extends SeparatorPrimitive.SeparatorProps {
  className?: string;
}
const Separator: FC<ISeparatorProps> = ({ className = '' }) => (
  <SeparatorPrimitive.Root className={cn('bg-bg-left-nav', className)} />
);

Separator.displayName = 'Separator';

export default Separator;
